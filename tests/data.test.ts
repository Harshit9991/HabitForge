import { describe, expect, it, vi } from "vitest";
import { createSupabaseAuthClient, isSessionExpired } from "../src/data/auth";
import { HabitForgeRepository } from "../src/data/habitforge-repository";
import { SyncOutbox } from "../src/data/sync-outbox";

describe("auth lifecycle", () => {
  it("recognizes expired sessions before replay", () => {
    expect(isSessionExpired({ userId: "u1", accessToken: "token", expiresAt: 100 }, 100)).toBe(true);
  });

  it("maps Supabase sessions to the app session contract", async () => {
    const api = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { user: { id: "u1" }, access_token: "token", expires_at: 200 } }, error: null })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(async () => ({ error: null })),
      },
    };
    const client = createSupabaseAuthClient(api);
    await expect(client.getSession()).resolves.toEqual({ userId: "u1", accessToken: "token", expiresAt: 200000 });
  });
});

describe("sync outbox", () => {
  it("deduplicates and quarantines actions by user and session", () => {
    const outbox = new SyncOutbox();
    const action = { kind: "set-note" as const, operationId: "op-1", date: "2026-01-15" as const, body: "note", baseRevision: 1 };
    outbox.enqueue(action, "u1", "s1");
    outbox.enqueue(action, "u1", "s1");
    expect(outbox.pending("u1", "s1")).toHaveLength(1);
    outbox.quarantineUser("u1");
    expect(outbox.pending("u1", "s1")[0].state).toBe("session-expired");
  });
});

describe("repository errors", () => {
  it("maps backend failures to explicit error codes", async () => {
    const client = {
      from: vi.fn(() => ({
        upsert: vi.fn(async () => ({ data: null, error: new Error("offline") })),
        select: vi.fn(),
      })),
      rpc: vi.fn(),
    };
    const repository = new HabitForgeRepository(client);
    await expect(repository.setCompletion({ kind: "set-completion", operationId: "op", journeyId: "j", habitId: "h", habitVersionId: "v", date: "2026-01-15", completed: true, baseRevision: 1 })).rejects.toMatchObject({ code: "completion_write_failed" });
  });
});
