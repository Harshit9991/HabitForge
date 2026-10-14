import { describe, expect, it } from "vitest";
import { createHabitVersion, isHabitEligible, type Habit } from "../src/domain/habits";
import { createJourney, localDateInTimeZone } from "../src/domain/journeys";
import { calculateDailyMetrics, calculateStreak } from "../src/domain/metrics";
import { actionKey, canApplyRevision } from "../src/domain/sync-contract";

const journey = createJourney("j1", "2026-01-15", "Asia/Kolkata");
const habits: Habit[] = [
  { id: "h1", archived: false, displayOrder: 1, versions: [createHabitVersion("h1", "Move", { kind: "daily" }, journey.startDate)] },
  { id: "h2", archived: false, displayOrder: 2, versions: [createHabitVersion("h2", "Focus", { kind: "weekdays" }, journey.startDate)] },
];

describe("journey contract", () => {
  it("uses an inclusive start and exclusive three-month boundary", () => {
    expect(journey.endDateExclusive).toBe("2026-04-15");
    expect(isHabitEligible(habits[0], "2026-01-15", journey)).toBe(true);
    expect(isHabitEligible(habits[0], "2026-04-14", journey)).toBe(true);
    expect(isHabitEligible(habits[0], "2026-04-15", journey)).toBe(false);
  });

  it("keeps timestamps in the journey-local calendar", () => {
    expect(localDateInTimeZone(new Date("2026-03-29T23:30:00Z"), "Asia/Kolkata")).toBe("2026-03-30");
    expect(localDateInTimeZone(new Date("2026-03-29T23:30:00Z"), "America/New_York")).toBe("2026-03-29");
  });
});

describe("shared metric contract", () => {
  it("rounds the same percentage for every consumer", () => {
    const metrics = calculateDailyMetrics(habits, [{ habitId: "h1", date: "2026-01-15", completed: true, versionId: "h1:2026-01-15" }], journey, "2026-01-15", { thresholdPercent: 50, graceTokens: 0, weeklyQuota: 1 });
    expect(metrics).toMatchObject({ completed: 1, eligible: 2, percentage: 50, thresholdMet: true });
  });

  it("stops a streak on the first missed threshold", () => {
    const settings = { thresholdPercent: 50, graceTokens: 0, weeklyQuota: 1 };
    const completions = [{ habitId: "h1", date: "2026-01-15" as const, completed: true, versionId: "h1:2026-01-15" }];
    expect(calculateStreak(habits, completions, journey, ["2026-01-15"], settings)).toBe(1);
  });
});

describe("sync contract", () => {
  it("deduplicates operation identity and rejects stale revisions", () => {
    const action = { kind: "set-note" as const, operationId: "op-1", date: "2026-01-15" as const, body: "x", baseRevision: 2 };
    expect(actionKey(action)).toBe("set-note:op-1");
    expect(canApplyRevision(action.baseRevision, 3)).toBe(false);
  });
});
