import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  objects: new Map<string, { body: Buffer; mime: string }>(),
  events: [] as string[],
  assetError: false,
  relationCleanupError: false,
  objectCleanupError: false,
  workspaceError: false,
  corruptPut: false,
  signedRequests: 0,
  deleteCalls: 0,
  failDeletionAt: 7,
  skipDeletion: false,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => ({
    from: (table: string) => ({
      insert: () =>
        table === "comun_archive_items"
          ? {
              select: () => ({
                single: async () => ({
                  data: { id: "synthetic-item" },
                  error: null,
                }),
              }),
            }
          : Promise.resolve({
              error: state.assetError
                ? { message: "private database detail" }
                : null,
            }),
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      select: () => ({ eq: async () => ({ count: 5, error: null }) }),
      delete: () => ({
        eq: async () => {
          state.events.push("database-cleanup");
          return {
            error: state.relationCleanupError
              ? { message: "private database detail" }
              : null,
          };
        },
      }),
    }),
  }),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rm: async (...args: Parameters<typeof actual.rm>) => {
      state.events.push("workspace-cleanup");
      // Actually remove the test workspace even when injecting a reported failure.
      await actual.rm(...args);
      if (state.workspaceError) throw new Error("private filesystem path");
    },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async () => "https://synthetic.invalid/signed",
}));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: class {
      async send(command: {
        constructor: { name: string };
        input: Record<string, unknown>;
      }) {
        const input = command.input;
        const key = `${input.Bucket}/${input.Key}`;
        switch (command.constructor.name) {
          case "ListObjectsV2Command":
            return { Contents: [] };
          case "PutObjectCommand":
            state.objects.set(key, {
              body: input.Body as Buffer,
              mime: input.ContentType as string,
            });
            return {};
          case "HeadObjectCommand": {
            const object = state.objects.get(key);
            if (!object) throw { $metadata: { httpStatusCode: 404 } };
            return {
              ContentLength: state.corruptPut ? -1 : object.body.length,
              ContentType: object.mime,
            };
          }
          case "GetObjectCommand": {
            const object = state.objects.get(key)!;
            return {
              Body: { transformToByteArray: async () => object.body },
              ContentType: object.mime,
            };
          }
          case "DeleteObjectsCommand": {
            state.events.push("object-cleanup");
            state.deleteCalls += 1;
            if (
              state.objectCleanupError &&
              state.deleteCalls >= state.failDeletionAt
            )
              return { Errors: [{ Message: "private storage detail" }] };
            const deletion = input.Delete as {
              Objects: Array<{ Key: string }>;
            };
            for (const item of deletion.Objects)
              if (!state.skipDeletion)
                state.objects.delete(`${input.Bucket}/${item.Key}`);
            return {};
          }
          default:
            throw new Error("unexpected command");
        }
      }
    },
  };
});

import { runRuntimeStorageRestoreRehearsal } from "./storage-restore-rehearsal";

beforeEach(() => {
  state.objects.clear();
  state.events = [];
  state.signedRequests = 0;
  state.deleteCalls = 0;
  state.failDeletionAt = 7;
  state.skipDeletion = false;
  state.assetError =
    state.relationCleanupError =
    state.objectCleanupError =
    state.workspaceError =
    state.corruptPut =
      false;
  for (const name of [
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
  ])
    vi.stubEnv(
      name,
      name === "R2_BUCKET_PUBLIC"
        ? "public"
        : name === "R2_BUCKET_ORIGINALS"
          ? "private"
          : "https://synthetic.invalid",
    );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/signed"))
        return { status: state.signedRequests++ === 0 ? 200 : 403 };
      return { status: url.includes("/private/") ? 403 : 200 };
    }),
  );
  const originalTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    callback: () => void,
    delay?: number,
  ) =>
    originalTimeout(
      callback,
      delay === 3000 ? 0 : delay,
    )) as typeof setTimeout);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("runtime Storage restore cleanup", () => {
  it("returns green only after removing objects and workspace", async () => {
    const result = await runRuntimeStorageRestoreRehearsal("synthetic-success");
    expect(result.result).toBe("COMUN_STORAGE_RESTORE_REHEARSAL_GREEN");
    expect(state.objects.size).toBe(0);
    expect(state.events.at(-1)).toBe("workspace-cleanup");
  });
  it("tracks the item when creating related assets fails", async () => {
    state.assetError = true;
    await expect(
      runRuntimeStorageRestoreRehearsal("synthetic-assets"),
    ).rejects.toThrow("COMUN_STORAGE_RUNTIME_RELATION_ASSET_FAILED");
    expect(state.events).toContain("database-cleanup");
    expect(state.events).toContain("workspace-cleanup");
    expect(state.objects.size).toBe(0);
  });
  it("cleans an uploaded object when verification fails", async () => {
    state.corruptPut = true;
    await expect(
      runRuntimeStorageRestoreRehearsal("synthetic-integrity"),
    ).rejects.toThrow("COMUN_STORAGE_RUNTIME_PUT_INTEGRITY_FAILED");
    expect(state.objects.size).toBe(0);
    expect(state.events).toContain("workspace-cleanup");
  });
  for (const field of [
    "relationCleanupError",
    "objectCleanupError",
    "workspaceError",
  ] as const) {
    it(`blocks success on ${field} without leaking provider details`, async () => {
      state[field] = true;
      await expect(
        runRuntimeStorageRestoreRehearsal("synthetic-cleanup"),
      ).rejects.toThrow(/^COMUN_STORAGE_RUNTIME_CLEANUP_FAILED$/);
      expect(state.events).toContain("workspace-cleanup");
    });
  }
  it("attempts database and workspace cleanup after object cleanup fails", async () => {
    state.assetError = true;
    state.objectCleanupError = true;
    state.failDeletionAt = 3;
    await expect(
      runRuntimeStorageRestoreRehearsal("synthetic-all-steps"),
    ).rejects.toThrow("COMUN_STORAGE_RUNTIME_CLEANUP_FAILED");
    expect(state.events).toContain("database-cleanup");
    expect(state.events).toContain("workspace-cleanup");
  });
  it("rejects deletion acknowledged while objects still exist", async () => {
    state.skipDeletion = true;
    await expect(
      runRuntimeStorageRestoreRehearsal("synthetic-leftovers"),
    ).rejects.toThrow("COMUN_STORAGE_RUNTIME_CLEANUP_FAILED");
    expect(state.events).toContain("workspace-cleanup");
  });
});
