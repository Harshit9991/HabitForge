import type { Journey, LocalDate } from "./journeys";

export type Frequency =
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "selected-weekdays"; weekdays: number[] }
  | { kind: "weekly-quota"; count: number };

export interface HabitVersion {
  id: string;
  habitId: string;
  label: string;
  frequency: Frequency;
  groupId: string | null;
  targetTime: string | null;
  activeFrom: LocalDate;
  activeUntilExclusive: LocalDate | null;
}

export interface Habit {
  id: string;
  archived: boolean;
  displayOrder: number;
  versions: HabitVersion[];
}

export function isHabitEligible(habit: Habit, date: LocalDate, journey: Journey): boolean {
  if (habit.archived || !journey.startDate || date < journey.startDate || date >= journey.endDateExclusive) return false;
  const version = versionForDate(habit, date);
  if (!version) return false;
  return isFrequencyEligible(version.frequency, date);
}

export function versionForDate(habit: Habit, date: LocalDate): HabitVersion | null {
  let current: HabitVersion | null = null;
  for (const version of habit.versions) {
    if (version.activeFrom <= date && (!version.activeUntilExclusive || date < version.activeUntilExclusive) &&
      (!current || version.activeFrom > current.activeFrom)) {
      current = version;
    }
  }
  return current;
}

export function isFrequencyEligible(frequency: Frequency, date: LocalDate): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (frequency.kind === "daily") return true;
  if (frequency.kind === "weekdays") return weekday >= 1 && weekday <= 5;
  if (frequency.kind === "selected-weekdays") return frequency.weekdays.includes(weekday);
  return true;
}

export function eligibleHabits(habits: Habit[], journey: Journey, date: LocalDate): Habit[] {
  return habits.filter((habit) => isHabitEligible(habit, date, journey));
}

export function createHabitVersion(
  habitId: string,
  label: string,
  frequency: Frequency,
  activeFrom: LocalDate,
  groupId: string | null = null,
  targetTime: string | null = null,
): HabitVersion {
  return { id: `${habitId}:${activeFrom}`, habitId, label, frequency, groupId, targetTime, activeFrom, activeUntilExclusive: null };
}
