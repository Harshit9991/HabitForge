import { useMemo, useState } from "react";
import { daysBetween, formatDate, type LocalDate } from "../../domain/journeys";
import type { Frequency } from "../../domain/habits";

export interface TrackerHabit {
  id: string;
  label: string;
  frequency: Frequency["kind"];
}

const initialHabits: TrackerHabit[] = [
  { id: "h1", label: "Morning movement", frequency: "daily" },
  { id: "h2", label: "Deep work block", frequency: "weekdays" },
  { id: "h3", label: "Evening review", frequency: "daily" },
];

export function useHabitState() {
  const [selectedDate, setSelectedDate] = useState<LocalDate>("2026-01-15");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const completedCount = useMemo(() => initialHabits.filter((habit) => completed[`${selectedDate}:${habit.id}`]).length, [completed, selectedDate]);
  const journey = { startDate: "2026-01-15" as LocalDate, endDateExclusive: "2026-04-15" as LocalDate, timezone: "Asia/Kolkata" };
  const dayNumber = daysBetween(journey.startDate, selectedDate) + 1;
  const journeyLength = daysBetween(journey.startDate, journey.endDateExclusive);
  const progressPercent = Math.round((dayNumber / journeyLength) * 100);

  function moveDate(offset: number) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + offset));
    const candidate = formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
    if (candidate >= journey.startDate && candidate < journey.endDateExclusive) setSelectedDate(candidate);
  }

  function toggleHabit(habitId: string) {
    const key = `${selectedDate}:${habitId}`;
    setCompleted((current) => ({ ...current, [key]: !current[key] }));
  }

  function markAll() {
    setCompleted((current) => {
      const today = Object.fromEntries(initialHabits.map((habit) => [`${selectedDate}:${habit.id}`, true]));
      if (initialHabits.every((habit) => current[`${selectedDate}:${habit.id}`])) return current;
      return { ...current, ...today };
    });
  }

  function reset() {
    setCompleted((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${selectedDate}:`)));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
    setNote("");
  }

  return {
    habits: initialHabits,
    selectedDate,
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
