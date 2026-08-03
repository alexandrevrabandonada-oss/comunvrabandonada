import { describe, expect, it } from "vitest";
import {
  decodeComunRelataReceiptCookie,
  encodeComunRelataReceiptCookie,
  isComunRelataPersistenceEnabled,
  isLoopbackSupabaseUrl,
} from "./comun-relata-persistence";

describe("COMUN Relata local persistence guard", () => {
  it("requires both flags, a loopback URL and an anon key", () => {
    const enabled = {
      COMUN_RELATA_PREVIEW: "enabled",
      COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon",
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
        COMUN_RELATA_PREVIEW: "disabled",
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
