import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), info: vi.fn(), signed: vi.fn(), download: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ storage: { from: mocks.from } }) }));
import { SupabaseLocalStorageProvider } from "./supabase-local";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-unit-key");
  mocks.from.mockReturnValue({ info: mocks.info, createSignedUrl: mocks.signed, download: mocks.download });
});
afterEach(() => vi.unstubAllEnvs());

describe("local storage metadata", () => {
  it("reads MIME and size from the radio bucket without downloading the file", async () => {
    mocks.info.mockResolvedValue({ data: { contentType: "audio/wav", size: 123, etag: "etag" }, error: null });
    const result = await new SupabaseLocalStorageProvider().getObjectMetadata("private_original", "radio-originals/episode/original.wav");
    expect(mocks.from).toHaveBeenCalledWith("radio-private-originals");
    expect(result).toMatchObject({ contentType: "audio/wav", contentLength: 123, etag: "etag" });
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("distinguishes a missing object from a storage outage", async () => {
    const provider = new SupabaseLocalStorageProvider();
    mocks.info.mockResolvedValue({ data: null, error: { statusCode: "404" } });
    expect(await provider.getObjectMetadata("public_safe", "public/photo.webp")).toBeNull();
    const outage = { statusCode: "503", message: "unavailable" };
    mocks.info.mockResolvedValue({ data: null, error: outage });
    await expect(provider.getObjectMetadata("public_safe", "public/photo.webp")).rejects.toEqual(outage);
  });

  it("signs private radio reads against the private radio bucket", async () => {
    mocks.signed.mockResolvedValue({ data: { signedUrl: "https://example.invalid/signed" }, error: null });
    await new SupabaseLocalStorageProvider().createPrivateReadUrl("radio-originals/episode/original.wav");
    expect(mocks.from).toHaveBeenCalledWith("radio-private-originals");
  });
});
