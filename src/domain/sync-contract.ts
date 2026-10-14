import type { LocalDate } from "./journeys";

export type SyncState = "pending-local" | "syncing" | "synced" | "failed" | "conflict" | "signed-out" | "session-expired";
export type ConflictKind = "stale-revision" | "same-record" | "batch-race";

export interface Revision {
  revision: number;
  updatedAt: string;
}

export interface CompletionAction {
  kind: "set-completion";
  operationId: string;
  habitId: string;
  date: LocalDate;
  completed: boolean;
  baseRevision: number;
}

export interface BatchAction {
  kind: "mark-all" | "reset";
  operationId: string;
  date: LocalDate;
  baseRevision: number;
}

export interface NoteAction {
  kind: "set-note";
  operationId: string;
  date: LocalDate;
  body: string;
  baseRevision: number;
}

export type SyncAction = CompletionAction | BatchAction | NoteAction;

export interface Conflict {
  kind: ConflictKind;
  local: unknown;
  server: unknown;
  revision: Revision;
}

export function actionKey(action: SyncAction): string {
  return `${action.kind}:${action.operationId}`;
}

export function canApplyRevision(baseRevision: number, serverRevision: number): boolean {
  return baseRevision >= serverRevision;
}
