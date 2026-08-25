import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260825120000_comun_followup_escalation_continuity.sql", import.meta.url),
  "utf8",
);

describe("48.6-A3 follow-up contract", () => {
  it("keeps the schema narrow and nullable for legacy attempts", () => {
    expect(migration).toContain("add column if not exists institutional_channel_id text");
    expect(migration).toContain("add column if not exists resolution_outcome text");
    expect(migration).toContain("resolution_outcome is null or resolution_outcome in ('resolved','unresolved')");
    expect(migration).not.toMatch(/update\s+private\.comun_forwarding_attempts\s+set\s+institutional_channel_id/i);
    expect(migration).not.toMatch(/update\s+private\.comun_forwarding_attempts\s+set\s+resolution_outcome/i);
  });

  it("uses canonical channel identity for the new open RPC and preserves legacy wrapper", () => {
    expect(migration).toContain("p_institutional_channel_id text");
    expect(migration).toContain("a.institutional_channel_id=v_channel_id");
    expect(migration).toContain("institutional_channel_id,state");
    expect(migration).toContain("values(p_package_id,v_sequence,p_channel,v_channel_id,'prepared')");
    expect(migration).toContain("comun_assisted_forwarding_open(p_token_hash_hex,p_package_id,p_channel,null)");
  });

  it("does not turn the legacy 72 hour reminder into an official deadline", () => {
    expect(migration).toContain("due_at");
    expect(migration).not.toContain("expected_response_at");
  });

  it("keeps client CRUD closed and official sending manual", () => {
    expect(migration).toContain("revoke all on function public.comun_assisted_forwarding_open");
    expect(migration).toContain("grant execute on function public.comun_assisted_forwarding_open(text,uuid,text,text) to service_role");
  });
});
