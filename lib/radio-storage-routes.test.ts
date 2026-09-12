import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  service: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  sign: vi.fn(),
  metadata: vi.fn(),
  remove: vi.fn(),
  process: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({ getComunAdminSession: mocks.session }));
vi.mock("@/lib/admin-audit", () => ({ logComunAdminAction: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: mocks.service,
}));
vi.mock("@/lib/media-storage", () => ({
  getMediaStorage: () => ({
    createUploadUrl: mocks.sign,
    getObjectMetadata: mocks.metadata,
    deleteObject: mocks.remove,
  }),
  publicMediaUrl: () => "https://example.invalid/public",
}));
vi.mock("@/lib/radio-audio", () => ({ processRadioAudio: mocks.process }));
import { POST as upload } from "@/app/api/comun/admin/archive/upload-url/route";
import { POST as confirm } from "@/app/api/comun/admin/archive/confirm-upload/route";
import { POST as processAudio } from "@/app/api/comun/admin/radio/process/route";

const asset = {
  id: "asset",
  archive_item_id: "episode",
  asset_role: "radio_private_original",
  bucket_scope: "private_original",
  object_key: "radio-originals/episode/original.wav",
  mime_type: "audio/wav",
  original_filename: "original.wav",
  size_bytes: 100,
};
function database(
  failedTable?: string,
  overrides: Record<string, unknown> = {},
) {
  mocks.from.mockImplementation((table: string) => {
    const result = {
      data: Object.hasOwn(overrides, table)
        ? overrides[table]
        : table === "comun_archive_items"
          ? { id: "episode", item_type: "community_radio_episode" }
          : table === "comun_radio_episodes"
            ? { archive_item_id: "episode" }
            : table === "comun_archive_assets"
              ? asset
              : table === "comun_radio_voice_consents"
                ? [{ consent_status: "approved", allow_comun_audio: true }]
                : [],
      count: 0,
      error: table === failedTable ? { message: "unavailable" } : null,
    };
    const query = {
      select: () => query,
      eq: () => query,
      gte: () => query,
      in: () => query,
      single: () => query,
      maybeSingle: () => query,
      insert: (value: unknown) => {
        mocks.insert(value);
        return query;
      },
      update: (value: unknown) => {
        mocks.update(value);
        return query;
      },
      delete: () => query,
      then: (resolve: (value: typeof result) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    return query;
  });
}
const request = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ admin: { id: "admin", role: "editor" } });
  mocks.service.mockImplementation(() => ({
    from: mocks.from,
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  }));
  database();
});

describe("radio upload and processing routes", () => {
  it.each([null, { admin: { role: "viewer" } }, { admin: { role: "member" } }])(
    "rejects an unauthorized session before the route's privileged client (%j)",
    async (session) => {
      mocks.session.mockResolvedValue(session);
      for (const route of [upload, confirm, processAudio]) {
        expect(
          (
            await route(
              request({
                assetId: "other-asset",
                episodeId: "other-episode",
                role: "admin",
              }),
            )
          ).status,
        ).toBe(401);
      }
      expect(mocks.service).not.toHaveBeenCalled();
      expect(mocks.sign).not.toHaveBeenCalled();
      expect(mocks.process).not.toHaveBeenCalled();
    },
  );
  it("reports database lookup outage as retryable without touching storage", async () => {
    database("comun_archive_assets");
    expect((await confirm(request({ assetId: "asset" }))).status).toBe(503);
    expect(mocks.metadata).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each([
    "comun_radio_voice_consents",
    "comun_radio_safety_reviews",
    "comun_radio_episodes",
  ])("blocks processing before exposure on failed %s query", async (table) => {
    database(table);
    expect(
      (await processAudio(request({ episodeId: "episode", assetId: "asset" })))
        .status,
    ).toBe(503);
    expect(mocks.process).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("blocks unapproved minor safety before creating public derivatives", async () => {
    database(undefined, {
      comun_radio_safety_reviews: {
        minor_involved_private: true,
        reinforced_review_status: "pending",
      },
    });
    expect(
      (await processAudio(request({ episodeId: "episode", assetId: "asset" })))
        .status,
    ).toBe(409);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it.each([
    {
      comun_radio_voice_consents: [
        { consent_status: "pending", allow_comun_audio: false },
      ],
    },
    {
      comun_radio_music_uses: [
        { rights_status: "pending", allow_streaming: false },
      ],
    },
  ])(
    "blocks unapproved rights before creating public derivatives (%j)",
    async (rows) => {
      database(undefined, rows);
      expect(
        (
          await processAudio(
            request({ episodeId: "episode", assetId: "asset" }),
          )
        ).status,
      ).toBe(409);
      expect(mocks.process).not.toHaveBeenCalled();
      expect(mocks.insert).not.toHaveBeenCalled();
    },
  );
  it("reports a missing episode explicitly before processing", async () => {
    database(undefined, { comun_radio_episodes: null });
    expect(
      (await processAudio(request({ episodeId: "missing", assetId: "asset" })))
        .status,
    ).toBe(404);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("stores canonical visibility while signing the private radio bucket", async () => {
    mocks.sign.mockResolvedValue({
      url: "https://example.invalid/upload",
      expiresAt: new Date(),
    });
    const response = await upload(
      request({
        archiveItemId: "episode",
        role: "radio_private_original",
        filename: "original.wav",
        mimeType: "audio/wav",
        sizeBytes: 100,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket_scope: "private_original",
        public_url: null,
      }),
    );
    expect(mocks.sign).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "radio_private_original" }),
    );
  });
  it("preserves an upload when metadata lookup is temporarily unavailable", async () => {
    mocks.metadata.mockRejectedValue(new Error("temporary outage"));
    expect((await confirm(request({ assetId: "asset" }))).status).toBe(503);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("confirms matching metadata without removing the original", async () => {
    mocks.metadata.mockResolvedValue({
      contentType: "audio/wav",
      contentLength: 100,
    });
    expect((await confirm(request({ assetId: "asset" }))).status).toBe(200);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("preserves validated audio when saving the confirmation fails", async () => {
    mocks.metadata.mockResolvedValue({
      contentType: "audio/wav",
      contentLength: 100,
    });
    mocks.update.mockImplementationOnce(() => {
      throw new Error("database unavailable");
    });
    expect((await confirm(request({ assetId: "asset" }))).status).toBe(503);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not process audio when the music-rights query fails", async () => {
    database("comun_radio_music_uses");
    expect(
      (await processAudio(request({ episodeId: "episode", assetId: "asset" })))
        .status,
    ).toBe(503);
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("writes public derivatives with the scope required by public projection", async () => {
    const file = {
      key: "radio-public/episode/episode.mp3",
      url: "https://example.invalid/episode.mp3",
      size: 20,
    };
    mocks.process.mockResolvedValue({
      audio: file,
      waveform: {
        ...file,
        key: "radio-public/episode/waveform.json",
        points: 10,
      },
      meta: { duration: 1, channels: 1 },
    });
    expect(
      (await processAudio(request({ episodeId: "episode", assetId: "asset" })))
        .status,
    ).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        asset_role: "radio_public_episode",
        bucket_scope: "public_safe",
      }),
      expect.objectContaining({
        asset_role: "radio_waveform",
        bucket_scope: "public_safe",
      }),
    ]);
  });
});
