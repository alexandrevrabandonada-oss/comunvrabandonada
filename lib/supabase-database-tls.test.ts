import { createHash, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { verifiedSupabaseDatabaseConfig } from "./supabase-database-tls";
const base =
  "postgresql://postgres.test:synthetic@aws-0-us-west-2.pooler.supabase.com:5432/postgres";
describe("verified Supabase database TLS", () => {
  it("retains certificate and hostname verification with the official CA", () => {
    const c = verifiedSupabaseDatabaseConfig(base + "?sslmode=verify-full");
    expect(new URL(c.connectionString!).searchParams.has("sslmode")).toBe(
      false,
    );
    expect(typeof c.ssl).toBe("object");
    const ssl = c.ssl as {
      ca: string;
      rejectUnauthorized: boolean;
      checkServerIdentity?: unknown;
    };
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.checkServerIdentity).toBeUndefined();
    expect(new X509Certificate(ssl.ca).subject).toContain("Supabase");
    expect(createHash("sha256").update(ssl.ca).digest("hex")).toBe(
      "fc394230da75c837ff63837c033d0cd107635a88f121368d5943a674d6e018ef",
    );
  });
  it("preserves credentials and non-TLS parameters without logging them", () => {
    const c = verifiedSupabaseDatabaseConfig(
      base + "?sslmode=verify-full&application_name=synthetic",
    );
    expect(new URL(c.connectionString!).password).toBe("synthetic");
    expect(
      new URL(c.connectionString!).searchParams.get("application_name"),
    ).toBe("synthetic");
  });
  it.each(["sslcert", "sslkey", "sslrootcert", "ssl", "uselibpqcompat"])(
    "rejects conflicting %s parameters",
    (key) => {
      expect(() =>
        verifiedSupabaseDatabaseConfig(
          base + `?sslmode=verify-full&${key}=synthetic`,
        ),
      ).toThrow("COMUN_DATABASE_TLS_OPTIONS_CONFLICT");
    },
  );
  it("supports the direct Supabase hostname", () => {
    expect(
      verifiedSupabaseDatabaseConfig(
        "postgresql://postgres:synthetic@db.synthetic.supabase.co/postgres?sslmode=verify-full",
      ).ssl,
    ).toMatchObject({ rejectUnauthorized: true });
  });
  it.each([
    "postgresql://localhost/test",
    "postgresql://db.example.org/test?sslmode=verify-full",
    base,
    base + "?sslmode=require",
    base.replace(".supabase.com", ".supabase.com.attacker.invalid") +
      "?sslmode=verify-full",
  ])("does not change other connection contracts", (url) => {
    expect(verifiedSupabaseDatabaseConfig(url)).toEqual({
      connectionString: url,
    });
  });
  it("both existing server clients use the verified configuration", () => {
    for (const file of [
      "collective-actions-release.ts",
      "sidewalk-operational-release.ts",
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).toContain('import "server-only"');
      expect(source).toContain(
        "...verifiedSupabaseDatabaseConfig(connectionString)",
      );
    }
  });
});
