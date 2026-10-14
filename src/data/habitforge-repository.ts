import type { CompletionAction, SyncAction } from "../domain/sync-contract";
import type { Frequency } from "../domain/habits";
import type { LocalDate } from "../domain/journeys";

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
