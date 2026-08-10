import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationName = "20260810194054_comun_sensitive_assisted_forwarding.sql";
const read = (path: string) => readFileSync(path, "utf8");

describe("COMUN P6C-C sensitive assisted forwarding contract", () => {
  it("owns exactly one narrow forwarding migration", () => {
    expect(
      readdirSync("supabase/migrations").filter((name) =>
        /comun_sensitive_assisted_forwarding/i.test(name),
      ),
    ).toEqual([migrationName]);
    const migration = read(`supabase/migrations/${migrationName}`);
    expect(migration).toContain("'sensitive_service'");
    expect(migration).toContain("health_minimal_v1");
    expect(migration).toContain("education_minimal_v1");
    expect(migration).toContain("child_protection_channel_only_v1");
    expect(migration).toContain("disclosure_manifest");
    expect(migration).toContain("content_withdrawn_at");
    expect(migration).toContain("FORWARDING_SENSITIVE_CONTENT_WITHDRAWN");
    expect(migration).not.toMatch(/create table|delete from|truncate|backfill/i);
  });

  it("derives category and policy server-side and never accepts original text", () => {
    const migration = read(`supabase/migrations/${migrationName}`);
    const route = read("app/api/comun/sensitive-forwarding/[...path]/route.ts");
    expect(migration).toContain("c.category in ('public_health','public_education','child_protection')");
    expect(migration).not.toContain("p_category");
    expect(migration).not.toContain("original_text");
    expect(route).not.toContain("originalText");
    expect(route).not.toContain("location");
    expect(route).not.toContain("attachment");
  });

  it("requires preview, explicit authorization and person-declared send", () => {
    const panel = read("app/comun/minha-participacao/comun-sensitive-forwarding-panel.tsx");
    const route = read("app/api/comun/sensitive-forwarding/[...path]/route.ts");
    expect(panel).toContain("SERÁ COMPARTILHADO");
    expect(panel).toContain("NÃO SERÁ COMPARTILHADO");
    expect(panel).toContain("authorizationConfirmed: true");
    expect(panel).toContain("authorizationProof");
    expect(route).toContain("timingSafeEqual");
    expect(route).toContain("authorizationExpiresAt");
    expect(route).toContain("p_authorization_confirmed: true");
    expect(route).toContain("comun_assisted_forwarding_declare_sent");
    expect(route).not.toContain("fetch(channel.destination");
  });

  it("keeps child protection channel-only without a copy action", () => {
    const panel = read("app/comun/minha-participacao/comun-sensitive-forwarding-panel.tsx");
    const migration = read(`supabase/migrations/${migrationName}`);
    expect(panel).toContain("!channelOnly");
    expect(panel).toContain("Copiar mensagem");
    expect(migration).toContain("Conteúdo será informado diretamente pela pessoa ao canal.");
    expect(migration).toContain("if v_category='child_protection' and v_note is not null");
  });
});
