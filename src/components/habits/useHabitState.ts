import { useEffect, useMemo, useRef, useState } from "react";
import { daysBetween, formatDate, isJourneyDate, type LocalDate } from "../../domain/journeys";
import type { Frequency } from "../../domain/habits";
import type { CompletionAction } from "../../domain/sync-contract";
import type { HabitRepository, JourneySnapshot } from "../../data/habitforge-repository";

export interface TrackerHabit {
  id: string;
  versionId: string;
  label: string;
  frequency: Frequency["kind"];
}

export function useHabitState(repository: HabitRepository | null) {
  const [snapshot, setSnapshot] = useState<JourneySnapshot | null>(null);
  const [selectedDate, setSelectedDate] = useState<LocalDate | null>(null);
  const [syncState, setSyncState] = useState<"pending-local" | "syncing" | "synced" | "failed">("syncing");
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
  }, []);

  useEffect(() => {
    let active = true;
    if (!repository) {
      setSyncState("failed");
      return () => { active = false; };
    }
    setSyncState("syncing");
    repository.loadSnapshot().then((loaded) => {
      if (!active) return;
      setSnapshot(loaded);
      setSelectedDate((current) => current ?? loaded.journey.startDate);
      setSyncState("synced");
    }).catch(() => {
      if (active) setSyncState("failed");
    });
    return () => { active = false; };
  }, [repository]);

  const journey = snapshot?.journey ?? {
    id: "",
    startDate: "2026-01-15" as LocalDate,
    endDateExclusive: "2026-04-15" as LocalDate,
    timezone: "Asia/Kolkata",
  };
  const date = selectedDate ?? journey.startDate;
  const habits = snapshot?.habits ?? [];
  const completed = snapshot?.entries ?? {};
  const note = snapshot?.notes[date] ?? "";
  const completedCount = useMemo(() => habits.filter((habit) => completed[`${date}:${habit.id}`]).length, [completed, date, habits]);
  const dayNumber = daysBetween(journey.startDate, date) + 1;
  const journeyLength = daysBetween(journey.startDate, journey.endDateExclusive);
  const progressPercent = Math.round((dayNumber / journeyLength) * 100);

  function moveDate(offset: number) {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + offset));
    const candidate = formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
    if (isJourneyDate(journey, candidate)) setSelectedDate(candidate);
  }

  async function runMutation(mutation: () => Promise<unknown>) {
    setSyncState("pending-local");
    try {
      await mutation();
      const refreshed = await repository?.loadSnapshot();
      if (refreshed) setSnapshot(refreshed);
      setSyncState("synced");
    } catch {
      setSyncState("failed");
    }
  }

  function toggleHabit(habitId: string) {
    const habit = habits.find((candidate) => candidate.id === habitId);
    if (!habit || !repository) return;
    const action: CompletionAction = {
      kind: "set-completion",
      operationId: crypto.randomUUID(),
      journeyId: journey.id,
      habitId,
      habitVersionId: habit.versionId,
      date,
      completed: !completed[`${date}:${habitId}`],
      baseRevision: 1,
    };
    void runMutation(() => repository.setCompletion(action));
  }

  function markAll() {
    if (repository) void runMutation(() => repository.markAll(date));
  }

  function reset() {
    if (repository) void runMutation(() => repository.reset(date));
  }

  function setNote(body: string) {
    if (snapshot) setSnapshot({ ...snapshot, notes: { ...snapshot.notes, [date]: body } });
    if (!repository) return;
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setSyncState("pending-local");
    noteTimer.current = setTimeout(() => {
      void repository.setNote({ date, body })
        .then(() => setSyncState("synced"))
        .catch(() => setSyncState("failed"));
    }, 400);
  }

  return {
    loading: !snapshot && syncState === "syncing",
    syncState,
    habits,
    selectedDate: date,
    setSelectedDate,
    moveDate,
    journey,
    dayNumber,
    journeyLength,
    progressPercent,
    completed,
    completedCount,
    note,
    setNote,
    toggleHabit,
    markAll,
    reset,
  };
}
