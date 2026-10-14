import type { SyncState } from "../../domain/sync-contract";

const copy: Record<SyncState, string> = {
  "pending-local": "Change pending locally",
  syncing: "Syncing",
  synced: "Saved",
  failed: "Sync failed - retry available",
  conflict: "Conflict needs review",
  "signed-out": "Signed out",
  "session-expired": "Session expired - sign in again",
};

export function SyncStatus({ state = "pending-local" }: { state?: SyncState }) {
  return <p className={`sync-copy sync-${state}`} role="status"><span className="status-dot" aria-hidden="true" />{copy[state]}</p>;
}
