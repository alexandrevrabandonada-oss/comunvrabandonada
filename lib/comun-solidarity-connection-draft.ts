import {
  readComunOptionalStorage,
  removeComunOptionalStorage,
  writeComunOptionalStorage,
} from "./comun-pwa";
import { normalizeSolidarityConnectionMessage } from "./comun-solidarity-private-connections";

export const SOLIDARITY_DRAFT_PREFIX = "comun:solidarity-connection:";
export const SOLIDARITY_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;
export type ConnectionDraftContext = {
  owner: string | null;
  subjectKind: "offer" | "need";
  subjectId: string;
  organizationTerritoryId: string;
};
type Draft = {
  version: 2;
  owner: string;
  subjectKind: "offer" | "need";
  subjectId: string;
  organizationTerritoryId: string;
  requestId: string;
  message: string;
  savedAt: number;
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNER = /^[a-f0-9]{64}$/;
const fields = [
  "version",
  "owner",
  "subjectKind",
  "subjectId",
  "organizationTerritoryId",
  "requestId",
  "message",
  "savedAt",
].sort();
export const connectionDraftKey = (context: ConnectionDraftContext) =>
  `${SOLIDARITY_DRAFT_PREFIX}v2:${context.subjectKind}:${context.subjectId}`;

type StorageSource = () => Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

/** Never read/interpret v1 content: it contains private contact and stale consent. */
export function discardLegacyConnectionDraft(resolve: StorageSource) {
  try {
    const storage = resolve();
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith(`${SOLIDARITY_DRAFT_PREFIX}v1:`)) keys.push(key);
    }
    let cleared = true;
    for (const key of keys)
      cleared = removeComunOptionalStorage(resolve, key) && cleared;
    return cleared;
  } catch {
    return false;
  }
}

export function readConnectionDraft(
  resolve: StorageSource,
  context: ConnectionDraftContext,
  now = Date.now(),
):
  | { status: "available"; draft: Draft }
  | { status: "empty" | "unavailable" | "discard_failed" } {
  const result = readComunOptionalStorage(resolve, connectionDraftKey(context));
  if (!result.available) return { status: "unavailable" };
  if (result.value === null) return { status: "empty" };
  try {
    if (result.value.length > 2400) throw new Error("invalid");
    const value = JSON.parse(result.value) as Draft;
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).sort().join() !== fields.join() ||
      value.version !== 2 ||
      !context.owner ||
      !OWNER.test(context.owner) ||
      value.owner !== context.owner ||
      value.subjectKind !== context.subjectKind ||
      value.subjectId !== context.subjectId ||
      value.organizationTerritoryId !== context.organizationTerritoryId ||
      !UUID.test(value.requestId) ||
      !normalizeSolidarityConnectionMessage(value.message) ||
      !Number.isFinite(value.savedAt) ||
      !Number.isFinite(now) ||
      value.savedAt > now ||
      now - value.savedAt >= SOLIDARITY_DRAFT_MAX_AGE_MS
    )
      throw new Error("invalid");
    return { status: "available", draft: value };
  } catch {
    return {
      status: removeConnectionDraft(resolve, context)
        ? "empty"
        : "discard_failed",
    };
  }
}

export function saveConnectionDraft(
  resolve: StorageSource,
  context: ConnectionDraftContext,
  requestId: string,
  message: string,
  now = Date.now(),
) {
  const normalized = normalizeSolidarityConnectionMessage(message);
  if (
    !context.owner ||
    !OWNER.test(context.owner) ||
    !UUID.test(requestId) ||
    !UUID.test(context.subjectId) ||
    !UUID.test(context.organizationTerritoryId) ||
    !normalized ||
    !Number.isFinite(now)
  )
    return false;
  // Explicit allowlist: contact/consent can never be serialized, even if callers gain fields.
  return writeComunOptionalStorage(
    resolve,
    connectionDraftKey(context),
    JSON.stringify({
      version: 2,
      owner: context.owner,
      subjectKind: context.subjectKind,
      subjectId: context.subjectId,
      organizationTerritoryId: context.organizationTerritoryId,
      requestId,
      message: normalized,
      savedAt: now,
    } satisfies Draft),
  );
}

export function removeConnectionDraft(
  resolve: StorageSource,
  context: ConnectionDraftContext,
) {
  return removeComunOptionalStorage(resolve, connectionDraftKey(context));
}

/** Best-effort browser cleanup; denied access is not advertised as deletion. */
export function clearSolidarityConnectionDrafts(resolve: StorageSource) {
  try {
    const storage = resolve();
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith(SOLIDARITY_DRAFT_PREFIX)) keys.push(key);
    }
    let cleared = true;
    for (const key of keys)
      cleared = removeComunOptionalStorage(resolve, key) && cleared;
    return cleared;
  } catch {
    return false;
  }
}

/** External storage adapter: no browser reads during the initial React render. */
export function createConnectionDraftStore(
  resolve: StorageSource,
  context: ConnectionDraftContext,
) {
  type Status =
    "checking" | "available" | "empty" | "unavailable" | "discard_failed";
  let status: Status = "checking";
  const listeners = new Set<() => void>();
  function publish(next: Status) {
    if (status === next) return;
    status = next;
    for (const listener of listeners) listener();
  }
  function refresh() {
    const legacyRemoved = discardLegacyConnectionDraft(resolve);
    const result = readConnectionDraft(resolve, context);
    publish(legacyRemoved ? result.status : "discard_failed");
  }
  return {
    getServerSnapshot: () => "checking" as Status,
    getSnapshot: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      refresh();
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    discard() {
      const removed = removeConnectionDraft(resolve, context);
      publish(removed ? "empty" : "discard_failed");
      return removed;
    },
    suspend() {
      publish("unavailable");
    },
  };
}
