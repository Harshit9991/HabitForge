import type { Habit } from "./habits";
import { eligibleHabits } from "./habits";
import type { Journey, LocalDate } from "./journeys";

export interface Completion {
  habitId: string;
  date: LocalDate;
  completed: boolean;
  versionId: string;
}

export interface MetricSettings {
  thresholdPercent: number;
  graceTokens: number;
  weeklyQuota: number;
}

export interface DailyMetrics {
  completed: number;
  eligible: number;
  percentage: number;
  thresholdMet: boolean;
  groupCounts: Record<string, { completed: number; eligible: number }>;
}

export function calculateDailyMetrics(
  habits: Habit[],
  completions: Completion[],
  journey: Journey,
  date: LocalDate,
  settings: MetricSettings,
): DailyMetrics {
  const eligible = eligibleHabits(habits, journey, date);
  const dateCompletions = new Map(completions.filter((entry) => entry.date === date).map((entry) => [entry.habitId, entry]));
  const completedIds = new Set([...dateCompletions.values()].filter((entry) => entry.completed).map((entry) => entry.habitId));
  const groupCounts: DailyMetrics["groupCounts"] = {};
  let completed = 0;
  for (const habit of eligible) {
    const groupId = habit.versions.find((version) => version.id === dateCompletions.get(habit.id)?.versionId)?.groupId ?? "ungrouped";
    groupCounts[groupId] ??= { completed: 0, eligible: 0 };
    groupCounts[groupId].eligible += 1;
    if (completedIds.has(habit.id)) {
      completed += 1;
      groupCounts[groupId].completed += 1;
    }
  }
  const percentage = eligible.length === 0 ? 0 : Math.round((completed / eligible.length) * 100);
  return { completed, eligible: eligible.length, percentage, thresholdMet: percentage >= settings.thresholdPercent, groupCounts };
}

export function calculateStreak(
  habits: Habit[],
  completions: Completion[],
  journey: Journey,
  dates: LocalDate[],
  settings: MetricSettings,
): number {
  let streak = 0;
  for (const date of [...dates].sort().reverse()) {
    const metrics = calculateDailyMetrics(habits, completions, journey, date, settings);
    if (metrics.eligible > 0 && metrics.thresholdMet) streak += 1;
    else break;
  }
  return streak;
}

export function weeklyQuotaMet(completions: Completion[], habit: Habit, dates: LocalDate[], quota: number): boolean {
  const completedDates = new Set(completions.filter((entry) => entry.habitId === habit.id && entry.completed).map((entry) => entry.date));
  return dates.filter((date) => completedDates.has(date)).length >= quota;
}
