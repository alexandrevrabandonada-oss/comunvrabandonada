import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const env = {
  COMUN_RELATA_PREVIEW: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_RELATA_LOCAL_EVIDENCE: "enabled",
  COMUN_RELATA_LOCATION_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-only",
  COMUN_RELATA_LOCATION_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString(
    "base64url",
  ),
  COMUN_RELATA_SPATIAL_HMAC_KEY: Buffer.alloc(32, 29).toString("base64url"),
};

let evidence: typeof import("./comun-relata-evidence");

beforeAll(async () => {
  evidence = await import("./comun-relata-evidence");
});
describe("COMUN Relata private location", () => {
  const protocol = "COMUN-RELATA-0123456789ABCDEF";

  it("uses unique nonces and ciphertext while decrypting only server-side", () => {
    const input = { longitude: -44.101, latitude: -22.52, accuracyMeters: 18 };
    const first = evidence.encryptComunRelataLocation(input, protocol, env);
    const second = evidence.encryptComunRelataLocation(input, protocol, env);
    expect(first.nonce).not.toEqual(second.nonce);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
    expect(
      evidence.decryptComunRelataLocationForLocalTest(first, protocol, env),
    ).toEqual(input);
    expect(() =>
      evidence.decryptComunRelataLocationForLocalTest(
        first,
        "COMUN-RELATA-FEDCBA9876543210",
        env,
      ),
    ).toThrow();
  });

  it("fails closed for absent or malformed independent keys", () => {
    expect(() =>
      evidence.encryptComunRelataLocation(
        { longitude: -44.1, latitude: -22.5, accuracyMeters: null },
        protocol,
        { ...env, COMUN_RELATA_LOCATION_ENCRYPTION_KEY: undefined },
      ),
    ).toThrow("COMUN_RELATA_LOCATION_DISABLED");
  });

  it("derives overlapping opaque neighbor keys without exposing cells", () => {
    const first = evidence.deriveComunRelataMatchPlan(
      {
        category: "public_lighting",
        urgency: "attention",
        privacyClass: "public_after_sanitization",
        longitude: -44.101,
        latitude: -22.52,
      },
      env,
    );
    const nearby = evidence.deriveComunRelataMatchPlan(
      {
        category: "public_lighting",
        urgency: "attention",
        privacyClass: "public_after_sanitization",
        longitude: -44.1008,
        latitude: -22.5198,
      },
      env,
    );
    const firstHex = new Set(first.spatialKeys.map((value) => value.toString("hex")));
    expect(nearby.spatialKeys.some((value) => firstHex.has(value.toString("hex")))).toBe(true);
    expect(first.spatialKeys.every((value) => value.byteLength === 32)).toBe(true);
    expect(Buffer.concat(first.spatialKeys).toString()).not.toContain("-44.101");
  });

  it("never computes match keys for emergency or high-risk reports", () => {
    const plan = evidence.deriveComunRelataMatchPlan(
      {
        category: "active_fire",
        urgency: "emergency",
        privacyClass: "high_risk",
        longitude: -44.1,
        latitude: -22.5,
      },
      { ...env, COMUN_RELATA_SPATIAL_HMAC_KEY: undefined },
    );
    expect(plan).toMatchObject({ decision: "never_auto_link", spatialKeys: [] });
  });
});

describe("COMUN Relata private photos", () => {
  it.each([
    ["JPEG", () => sharp({ create: { width: 64, height: 48, channels: 3, background: "#777" } }).jpeg().toBuffer(), "image/jpeg"],
    ["PNG", () => sharp({ create: { width: 64, height: 48, channels: 3, background: "#777" } }).png().toBuffer(), "image/png"],
    ["WebP", () => sharp({ create: { width: 64, height: 48, channels: 3, background: "#777" } }).webp().toBuffer(), "image/webp"],
  ])("validates bytes and creates a private metadata-free derivative for %s", async (_label, factory, mime) => {
    const body = await factory();
    const result = await evidence.validateAndDeriveComunRelataPhoto(body);
    expect(result.mimeType).toBe(mime);
    expect(result.width).toBe(64);
    expect(result.height).toBe(48);
    const derivative = await sharp(result.derivative).metadata();
    expect(derivative.format).toBe("webp");
    expect(derivative.exif).toBeUndefined();
    expect(result.checksum).toHaveLength(32);
  });

  it("rejects spoofed signatures, corruption and oversized payloads", async () => {
    await expect(
      evidence.validateAndDeriveComunRelataPhoto(Buffer.from("not-an-image")),
    ).rejects.toThrow("COMUN_RELATA_PHOTO_TYPE_INVALID");
    const corrupt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(40)]);
    await expect(evidence.validateAndDeriveComunRelataPhoto(corrupt)).rejects.toThrow();
    await expect(
      evidence.validateAndDeriveComunRelataPhoto(
        Buffer.alloc(evidence.COMUN_RELATA_MAX_PHOTO_BYTES + 1),
      ),
    ).rejects.toThrow("COMUN_RELATA_PHOTO_SIZE_INVALID");
  });
});
