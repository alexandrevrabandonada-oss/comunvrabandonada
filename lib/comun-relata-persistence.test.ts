import { describe, expect, it } from "vitest";
import {
  decodeComunRelataReceiptCookie,
  encodeComunRelataReceiptCookie,
  isComunRelataPersistenceEnabled,
  isLoopbackSupabaseUrl,
} from "./comun-relata-persistence";

describe("COMUN Relata persistence guard", () => {
  it("requires the local test envelope for loopback persistence", () => {
    const enabled = {
      ALLOW_LOCAL_TESTS: "true",
      COMUN_RELATA_PREVIEW: "enabled",
      COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431",
      SUPABASE_SERVICE_ROLE_KEY: "local-service-only",
    };
    expect(isComunRelataPersistenceEnabled(enabled)).toBe(true);
    expect(
      isComunRelataPersistenceEnabled({
        ...enabled,
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    ).toBe(false);
    expect(
      isComunRelataPersistenceEnabled({
        ...enabled,
        COMUN_RELATA_LOCAL_PERSISTENCE: "disabled",
      }),
    ).toBe(false);
  });

  it("accepts the canonical HTTPS Production flag without local aliases", () => {
    expect(
      isComunRelataPersistenceEnabled({
        COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "server-only",
      }),
    ).toBe(true);
    expect(
      isComunRelataPersistenceEnabled({
        COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "server-only",
      }),
    ).toBe(false);
  });

  it("rejects remote and malformed Supabase targets", () => {
    expect(isLoopbackSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLoopbackSupabaseUrl("https://localhost:54321")).toBe(false);
    expect(isLoopbackSupabaseUrl("https://project.supabase.co")).toBe(false);
  });

  it("round-trips a scoped opaque receipt and rejects malformed values", () => {
    const protocol = "COMUN-RELATA-0123456789ABCDEF";
    const secret = "A".repeat(43);
    expect(
      decodeComunRelataReceiptCookie(
        encodeComunRelataReceiptCookie(protocol, secret),
      ),
    ).toEqual({
      protocol,
      receiptSecret: secret,
    });
    expect(decodeComunRelataReceiptCookie("not-a-receipt")).toBeNull();
  });
});
