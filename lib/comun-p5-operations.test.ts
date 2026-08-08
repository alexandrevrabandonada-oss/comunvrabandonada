import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STMU_WHATSAPP_CHANNEL } from "./comun-stmu-whatsapp";
import { STMU_EMAIL_CHANNEL } from "./comun-stmu-multichannel";

const migrationPath = "supabase/migrations/20260808220000_comun_bus_stmu_assisted.sql";
const sql = readFileSync(migrationPath, "utf8");

describe("COMUN P5 operational boundary", () => {
  it("uses one additive private-schema migration with forced RLS", () => {
    expect(sql).toContain("create table private.comun_bus_relata_intakes");
    expect(sql).toContain("create table private.comun_forwarding_attempts");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("revoke all on table private.comun_bus_relata_intakes from public, anon, authenticated");
    expect(sql).toContain("revoke all on table private.comun_forwarding_attempts from public, anon, authenticated");
    expect(sql).not.toMatch(/drop\s+table|truncate\s+|delete\s+from/i);
    expect(createHash("sha256").update(sql).digest("hex")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps RPCs server-only and events append-only", () => {
    expect(sql).toContain("COMUN_FORWARDING_EVENTS_APPEND_ONLY");
    expect(sql).toContain("grant execute on function public.comun_stmu_assisted_open");
    expect(sql).toContain("to service_role");
    expect(sql).not.toContain("grant execute on function public.comun_stmu_assisted_open(text,uuid,text) to anon");
  });

  it("pins destinations without message-bearing query strings", () => {
    expect(STMU_WHATSAPP_CHANNEL.officialUrl).toBe("https://wa.me/5524992958558");
    expect(new URL(STMU_WHATSAPP_CHANNEL.officialUrl).search).toBe("");
    expect(STMU_EMAIL_CHANNEL.destination).toBe("mailto:stmu@voltaredonda.rj.gov.br");
    expect(STMU_EMAIL_CHANNEL.destination).not.toContain("?");
    expect(sql).toContain("72 horas é uma referência de acompanhamento do COMUN, não prazo legal nem garantia de resposta.");
  });
});
