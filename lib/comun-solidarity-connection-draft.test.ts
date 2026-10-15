import { describe, expect, it } from "vitest";
import {
  clearSolidarityConnectionDrafts,
  createConnectionDraftStore,
  connectionDraftKey,
  discardLegacyConnectionDraft,
  readConnectionDraft,
  removeConnectionDraft,
  saveConnectionDraft,
  SOLIDARITY_DRAFT_MAX_AGE_MS,
  type ConnectionDraftContext,
} from "./comun-solidarity-connection-draft";
const context: ConnectionDraftContext = {
  owner: "a".repeat(64),
  subjectKind: "offer",
  subjectId: "a5000000-0000-4000-8000-000000000021",
  organizationTerritoryId: "a5000000-0000-4000-8000-000000000011",
};
const request = "a5000000-0000-4000-8000-000000000031";
const message = "Gostaria de conhecer esta oferta.";
const now = 1_000_000;
function memory() {
  const map = new Map<string, string>();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}
describe("SOC-D08 private message draft", () => {
  it("serializes only the allowlist, never caller contact or consent", () => {
    const store = memory();
    expect(
      saveConnectionDraft(
        () => store,
        {
          ...context,
          contact: "private@example.invalid",
          consent: true,
        } as ConnectionDraftContext,
        request,
        message,
        now,
      ),
    ).toBe(true);
    expect(
      Object.keys(
        JSON.parse(store.getItem(connectionDraftKey(context))!),
      ).sort(),
    ).toEqual(
      [
        "version",
        "owner",
        "subjectKind",
        "subjectId",
        "organizationTerritoryId",
        "requestId",
        "message",
        "savedAt",
      ].sort(),
    );
    expect(readConnectionDraft(() => store, context, now).status).toBe(
      "available",
    );
  });
  it("does not save anonymous messages or sensitive contact bypass", () => {
    const store = memory();
    expect(
      saveConnectionDraft(
        () => store,
        { ...context, owner: null },
        request,
        message,
        now,
      ),
    ).toBe(false);
    expect(
      saveConnectionDraft(
        () => store,
        context,
        request,
        "Meu contato e pessoa@example.invalid",
        now,
      ),
    ).toBe(false);
    expect(store.length).toBe(0);
  });
  for (const changed of [
    { owner: "b".repeat(64) },
    { owner: null },
    { subjectKind: "need" as const },
    { subjectId: request },
    { organizationTerritoryId: request },
  ]) {
    it(`does not expose a mismatching journey ${Object.keys(changed)[0]} even when removal fails`, () => {
      const store = memory();
      saveConnectionDraft(() => store, context, request, message, now);
      const other = { ...context, ...changed };
      store.setItem(
        connectionDraftKey(other),
        store.getItem(connectionDraftKey(context))!,
      );
      const result = readConnectionDraft(
        () => ({
          ...store,
          removeItem() {
            throw new Error("denied");
          },
        }),
        other,
        now,
      );
      expect(result).toEqual({ status: "discard_failed" });
      expect(result).not.toHaveProperty("draft");
    });
  }
  it.each([now + SOLIDARITY_DRAFT_MAX_AGE_MS, now - 1])(
    "discards expired/future timestamps at %s",
    (clock) => {
      const store = memory();
      saveConnectionDraft(() => store, context, request, message, now);
      expect(readConnectionDraft(() => store, context, clock)).toEqual({
        status: "empty",
      });
      expect(store.length).toBe(0);
    },
  );
  it.each([
    "not-json",
    "null",
    "[]",
    JSON.stringify({ version: 1, message, contact: "private", consent: true }),
  ])("rejects invalid/legacy input without returning it", (raw) => {
    const store = memory();
    store.setItem(connectionDraftKey(context), raw);
    expect(readConnectionDraft(() => store, context, now)).toEqual({
      status: "empty",
    });
  });
  it("rejects a v2 expansion that includes contact or consent", () => {
    const store = memory();
    saveConnectionDraft(() => store, context, request, message, now);
    store.setItem(
      connectionDraftKey(context),
      JSON.stringify({
        ...JSON.parse(store.getItem(connectionDraftKey(context))!),
        consent: true,
      }),
    );
    expect(readConnectionDraft(() => store, context, now)).toEqual({
      status: "empty",
    });
  });
  it("handles rejected storage getters, read, write and removal", () => {
    const denied = () => {
      throw new DOMException("denied", "SecurityError");
    };
    expect(readConnectionDraft(denied, context)).toEqual({
      status: "unavailable",
    });
    expect(saveConnectionDraft(denied, context, request, message)).toBe(false);
    expect(removeConnectionDraft(denied, context)).toBe(false);
    expect(clearSolidarityConnectionDrafts(denied)).toBe(false);
    const store = memory();
    expect(
      readConnectionDraft(() => ({ ...store, getItem: denied }), context),
    ).toEqual({ status: "unavailable" });
    expect(
      saveConnectionDraft(
        () => ({ ...store, setItem: denied }),
        context,
        request,
        message,
      ),
    ).toBe(false);
    expect(
      removeConnectionDraft(() => ({ ...store, removeItem: denied }), context),
    ).toBe(false);
  });
  it("logout clears v1/v2 for all items/owners but preserves unrelated data", () => {
    const store = memory();
    saveConnectionDraft(() => store, context, request, message, now);
    store.setItem("comun:solidarity-connection:v1:offer:old", "never-read");
    store.setItem("unrelated", "preserve");
    expect(clearSolidarityConnectionDrafts(() => store)).toBe(true);
    expect([...store.map.keys()]).toEqual(["unrelated"]);
    expect(discardLegacyConnectionDraft(() => store)).toBe(true);
  });
});

it("purges every legacy item without reading its content", () => {
  const values = new Map([
    ["comun:solidarity-connection:v1:offer:another-item", "private-never-read"],
    ["unrelated", "preserve"],
  ]);
  const store = {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem() {
      throw new Error("Legacy content must never be read");
    },
    setItem() {},
    removeItem(key: string) {
      values.delete(key);
    },
  };
  expect(discardLegacyConnectionDraft(() => store)).toBe(true);
  expect([...values.keys()]).toEqual(["unrelated"]);
});

it("keeps denied storage unavailable when legacy cleanup also fails", () => {
  const store = createConnectionDraftStore(() => {
    throw new Error("denied");
  }, context);
  expect(store.getServerSnapshot()).toBe("checking");
  expect(store.getSnapshot()).toBe("checking");
  const unsubscribe = store.subscribe(() => {});
  expect(store.getSnapshot()).toBe("unavailable");
  store.refresh();
  expect(store.getSnapshot()).toBe("unavailable");
  unsubscribe();
});
