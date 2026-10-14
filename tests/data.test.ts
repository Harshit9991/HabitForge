import { describe, expect, it, vi } from "vitest";
import { createSupabaseAuthClient, isSessionExpired } from "../src/data/auth";
import { HabitForgeRepository, createSeededHabitRepository } from "../src/data/habitforge-repository";
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

  it("uses the current app origin for confirmation links", async () => {
    const signUp = vi.fn(async () => ({
      data: { session: null },
      error: null,
    }));
    const api = {
      auth: {
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp,
        signOut: vi.fn(async () => ({ error: null })),
      },
    };
    const client = createSupabaseAuthClient(api, () => "https://habitforge-harshit-31ed.vercel.app");

    await expect(client.signUp("user@example.com", "password123")).resolves.toEqual({
      session: null,
      confirmationRequired: true,
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
      options: { emailRedirectTo: "https://habitforge-harshit-31ed.vercel.app" },
    });
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

  describe("journey read model", () => {
    it("persists completion and notes through the repository boundary", async () => {
      const repository = createSeededHabitRepository();
      const initial = await repository.loadSnapshot();
      expect(initial.habits).toHaveLength(3);
      await repository.setCompletion({
        kind: "set-completion",
        operationId: "op-1",
        journeyId: initial.journey.id,
        habitId: initial.habits[0].id,
        habitVersionId: initial.habits[0].versionId,
        date: "2026-01-15",
        completed: true,
        baseRevision: 1,
      });
      await repository.setNote({ date: "2026-01-15", body: "A useful note" });
      const updated = await repository.loadSnapshot();
      expect(updated.entries["2026-01-15:h1"]).toBe(true);
      expect(updated.notes["2026-01-15"]).toBe("A useful note");
    });
  });
});
