import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260808180246_comun_sidewalk_relata_real.sql";
const manifestPath = "supabase/releases/20260808180246-comun-sidewalk-relata-real.json";
const sql = readFileSync(migrationPath, "utf8");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

describe("P4 sidewalk Relata migration", () => {
  it("keeps the private adapter force-RLS and server mediated", () => {
    expect(sql).toContain("alter table private.comun_sidewalk_relata_intakes force row level security");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
    expect(sql).not.toMatch(/create policy[\s\S]+comun_sidewalk_relata_intakes/i);
  });

  it("stores no duplicate private evidence in the adapter", () => {
    const table = sql.slice(sql.indexOf("create table private.comun_sidewalk_relata_intakes"), sql.indexOf("create index comun_sidewalk_relata_review_queue_idx"));
    expect(table).not.toMatch(/original_text|longitude|latitude|cipher|nonce|auth_tag|object_key|receipt|wallet_token/);
  });

  it("publishes only an approximate geometry without a private geometry", () => {
    expect(sql).toContain("geometry_geojson, private_geometry_geojson");
    expect(sql).toContain("p_public_geometry, v_intake.problems");
    expect(sql).toContain("'approximate', 'editorial', 'approximate'");
    expect(sql).not.toMatch(/publish_exact|approve_exact|publicar.*exat/i);
  });

  it("matches the immutable release manifest", () => {
    const sha = createHash("sha256").update(readFileSync(migrationPath)).digest("hex");
    expect(manifest.sha256).toBe(sha);
    expect(manifest.migrationSha256).toBe(sha);
    expect(manifest.remotePromotionAllowed).toBe(true);
    expect(manifest.destructiveSql).toBe(false);
    expect(manifest.externalForwarding).toBe(false);
  });
});
