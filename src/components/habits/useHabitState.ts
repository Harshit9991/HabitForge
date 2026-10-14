import { useMemo, useState } from "react";
import type { LocalDate } from "../../domain/journeys";

export interface TrackerHabit {
  id: string;
  label: string;
  frequency: string;
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
  const habits = initialHabits;
  const completedCount = useMemo(() => habits.filter((habit) => completed[`${selectedDate}:${habit.id}`]).length, [completed, habits, selectedDate]);

  function toggleHabit(habitId: string) {
    const key = `${selectedDate}:${habitId}`;
    setCompleted((current) => ({ ...current, [key]: !current[key] }));
  }

  function markAll() {
    setCompleted((current) => Object.fromEntries([...Object.entries(current), ...habits.map((habit) => [`${selectedDate}:${habit.id}`, true])]));
  }

  function reset() {
    setCompleted((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${selectedDate}:`))));
    setNote("");
  }

  return {
    habits,
    selectedDate,
    setSelectedDate,
    completed,
    completedCount,
    note,
    setNote,
    toggleHabit,
    markAll,
    reset,
  };
}
