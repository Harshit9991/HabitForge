import { actionKey, type SyncAction, type SyncState } from "../domain/sync-contract";

export interface QueuedAction {
  action: SyncAction;
  userId: string;
  sessionGeneration: string;
  state: SyncState;
  attempts: number;
}

export class SyncOutbox {
  private queue = new Map<string, QueuedAction>();

  enqueue(action: SyncAction, userId: string, sessionGeneration: string): QueuedAction {
    const key = `${userId}:${sessionGeneration}:${actionKey(action)}`;
    const current = this.queue.get(key);
    if (current) return current;
    const queued = { action, userId, sessionGeneration, state: "pending-local" as const, attempts: 0 };
    this.queue.set(key, queued);
    return queued;
  }

  pending(userId: string, sessionGeneration: string): QueuedAction[] {
    return [...this.queue.values()].filter((item) => item.userId === userId && item.sessionGeneration === sessionGeneration);
  }

  markSyncing(action: SyncAction, userId: string, sessionGeneration: string) {
    const item = this.queue.get(`${userId}:${sessionGeneration}:${actionKey(action)}`);
    if (item) {
      item.state = "syncing";
      item.attempts += 1;
    }
  }

  markSynced(action: SyncAction, userId: string, sessionGeneration: string) {
    this.queue.delete(`${userId}:${sessionGeneration}:${actionKey(action)}`);
  }

  markFailed(action: SyncAction, userId: string, sessionGeneration: string) {
    const item = this.queue.get(`${userId}:${sessionGeneration}:${actionKey(action)}`);
    if (item) item.state = "failed";
  }

  quarantineUser(userId: string) {
    for (const [key, item] of this.queue) {
      if (item.userId === userId) this.queue.set(key, { ...item, state: "session-expired" });
    }
  }
}
