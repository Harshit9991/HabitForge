import type { CompletionAction, SyncAction } from "../domain/sync-contract";
import type { Frequency } from "../domain/habits";
import type { LocalDate } from "../domain/journeys";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface JourneySnapshot {
  journey: {
    id: string;
    startDate: LocalDate;
    endDateExclusive: LocalDate;
    timezone: string;
  };
  habits: Array<{ id: string; versionId: string; label: string; frequency: Frequency["kind"] }>;
  entries: Record<string, boolean>;
  notes: Record<string, string>;
}

export interface HabitRepository {
  loadSnapshot(): Promise<JourneySnapshot>;
  setCompletion(action: CompletionAction): Promise<unknown>;
  markAll(date: LocalDate): Promise<unknown>;
  reset(date: LocalDate): Promise<unknown>;
  setNote(input: { date: LocalDate; body: string }): Promise<unknown>;
}

export interface RepositoryClient {
  from(table: string): {
    upsert(payload: Record<string, unknown>, options?: { onConflict?: string }): Promise<{ data: unknown; error: Error | null }>;
    select(query?: string): Promise<{ data: unknown; error: Error | null }>;
  };
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: Error | null }>;
}

export class RepositoryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class HabitForgeRepository {
  constructor(private readonly client: RepositoryClient) {}

  async setCompletion(action: CompletionAction) {
    const { data, error } = await this.client.from("daily_habit_entries").upsert({
      habit_id: action.habitId,
      journey_id: action.journeyId,
      habit_version_id: action.habitVersionId,
      local_date: action.date,
      completed: action.completed,
    }, { onConflict: "journey_id,habit_id,local_date" });
    if (error) throw new RepositoryError("completion_write_failed", error.message);
    return data;
  }

  async markAll(journeyId: string, date: string, operationId: string, payloadHash: string) {
    const { data, error } = await this.client.rpc("mark_all_for_date", {
      p_journey_id: journeyId,
      p_local_date: date,
      p_operation_id: operationId,
      p_payload_hash: payloadHash,
    });
    if (error) throw new RepositoryError("batch_write_failed", error.message);
    return data;
  }

  async loadJourney(journeyId: string) {
    const { data, error } = await this.client.from("journeys").select(`id=${journeyId}`);
    if (error) throw new RepositoryError("journey_load_failed", error.message);
    return data;
  }

  async submit(action: SyncAction) {
    if (action.kind === "set-completion") return this.setCompletion(action);
    throw new RepositoryError("unsupported_action", `Unsupported repository action: ${action.kind}`);
  }
}

export class SupabaseHabitRepository implements HabitRepository {
  private journeyId: string | null = null;

  constructor(private readonly client: SupabaseClient) {}

  async loadSnapshot(): Promise<JourneySnapshot> {
    const journeyResult = await this.client
      .from("journeys")
      .select("id,start_date,end_date_exclusive,timezone")
      .eq("state", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (journeyResult.error) throw new RepositoryError("journey_load_failed", journeyResult.error.message);
    if (!journeyResult.data) throw new RepositoryError("journey_unavailable", "No active journey is available.");

    const journey = {
      id: journeyResult.data.id,
      startDate: journeyResult.data.start_date as LocalDate,
      endDateExclusive: journeyResult.data.end_date_exclusive as LocalDate,
      timezone: journeyResult.data.timezone,
    };
    this.journeyId = journey.id;

    const [habitsResult, entriesResult, notesResult] = await Promise.all([
      this.client.from("habits").select("id,archived_at,habit_versions(id,label,frequency,active_from,active_until_exclusive)").eq("journey_id", journey.id).is("archived_at", null).order("display_order"),
      this.client.from("daily_habit_entries").select("habit_id,local_date,completed").eq("journey_id", journey.id),
      this.client.from("daily_notes").select("local_date,body").eq("journey_id", journey.id),
    ]);
    if (habitsResult.error) throw new RepositoryError("habit_load_failed", habitsResult.error.message);
    if (entriesResult.error) throw new RepositoryError("entry_load_failed", entriesResult.error.message);
    if (notesResult.error) throw new RepositoryError("note_load_failed", notesResult.error.message);

    const habits = (habitsResult.data ?? []).flatMap((habit) => {
      const version = [...(habit.habit_versions ?? [])]
        .filter((candidate) => candidate.active_from <= journey.startDate)
        .sort((left, right) => right.active_from.localeCompare(left.active_from))[0];
      return version ? [{ id: habit.id, versionId: version.id, label: version.label, frequency: version.frequency.kind as Frequency["kind"] }] : [];
    });
    return {
      journey,
      habits,
      entries: Object.fromEntries((entriesResult.data ?? []).map((entry) => [`${entry.local_date}:${entry.habit_id}`, entry.completed])),
      notes: Object.fromEntries((notesResult.data ?? []).map((note) => [note.local_date, note.body])),
    };
  }

  async setCompletion(action: CompletionAction) {
    const { data, error } = await this.client.from("daily_habit_entries").upsert({
      journey_id: action.journeyId,
      habit_id: action.habitId,
      habit_version_id: action.habitVersionId,
      local_date: action.date,
      completed: action.completed,
    }, { onConflict: "journey_id,habit_id,local_date" }).select().single();
    if (error) throw new RepositoryError("completion_write_failed", error.message);
    return data;
  }

  async markAll(date: LocalDate) {
    if (!this.journeyId) throw new RepositoryError("journey_unavailable", "Load a journey before writing.");
    const { data, error } = await this.client.rpc("mark_all_for_date", {
      p_journey_id: this.journeyId,
      p_local_date: date,
      p_operation_id: crypto.randomUUID(),
      p_payload_hash: `${this.journeyId}:${date}:mark-all`,
    });
    if (error) throw new RepositoryError("batch_write_failed", error.message);
    return data;
  }

  async reset(date: LocalDate) {
    if (!this.journeyId) throw new RepositoryError("journey_unavailable", "Load a journey before writing.");
    const entries = await this.client.from("daily_habit_entries").update({ completed: false }).eq("journey_id", this.journeyId).eq("local_date", date);
    if (entries.error) throw new RepositoryError("batch_write_failed", entries.error.message);
    const notes = await this.client.from("daily_notes").delete().eq("journey_id", this.journeyId).eq("local_date", date);
    if (notes.error) throw new RepositoryError("note_write_failed", notes.error.message);
    return entries.data;
  }

  async setNote({ date, body }: { date: LocalDate; body: string }) {
    if (!this.journeyId) throw new RepositoryError("journey_unavailable", "Load a journey before writing.");
    const { data, error } = await this.client.from("daily_notes").upsert({
      journey_id: this.journeyId,
      local_date: date,
      body,
    }, { onConflict: "journey_id,local_date" }).select().single();
    if (error) throw new RepositoryError("note_write_failed", error.message);
    return data;
  }
}

export function createSupabaseHabitRepository(client: SupabaseClient): HabitRepository {
  return new SupabaseHabitRepository(client);
}

export function createSeededHabitRepository(): HabitRepository {
  const snapshot: JourneySnapshot = {
    journey: { id: "journey-1", startDate: "2026-01-15", endDateExclusive: "2026-04-15", timezone: "Asia/Kolkata" },
    habits: [
      { id: "h1", versionId: "v1", label: "Morning movement", frequency: "daily" },
      { id: "h2", versionId: "v2", label: "Deep work block", frequency: "weekdays" },
      { id: "h3", versionId: "v3", label: "Evening review", frequency: "daily" },
    ],
    entries: {},
    notes: {},
  };

  return {
    async loadSnapshot() {
      return structuredClone(snapshot);
    },
    async setCompletion(action) {
      snapshot.entries[`${action.date}:${action.habitId}`] = action.completed;
    },
    async markAll(date) {
      snapshot.habits.forEach((habit) => { snapshot.entries[`${date}:${habit.id}`] = true; });
    },
    async reset(date) {
      snapshot.habits.forEach((habit) => { delete snapshot.entries[`${date}:${habit.id}`]; });
      delete snapshot.notes[date];
    },
    async setNote({ date, body }) {
      snapshot.notes[date] = body;
    },
  };
}
