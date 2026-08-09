import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../supabase/migrations/20260809133923_comun_essential_services_assisted.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("P6A migration contract", () => {
  it("adds water and generalizes the existing forwarding core once", () => {
    expect(sql).toContain("'water_supply'");
    expect(sql).toContain("alter column bus_intake_id drop not null");
    expect(sql).toContain("alter column source_domain set default 'bus'");
    expect(sql).toContain("source_domain in ('bus','essential_service')");
    expect(sql).toContain("source_domain='bus' and bus_intake_id is not null");
    expect(sql).toContain(
      "source_domain='essential_service' and bus_intake_id is null",
    );
    expect(sql).not.toContain("water_forwarding_packages");
    expect(sql).not.toContain("power_forwarding_packages");
    expect(sql).not.toContain("lighting_forwarding_packages");
  });

  it("keeps channel destinations out of SQL and prepared distinct from sent", () => {
    expect(sql).toContain("'web'");
    expect(sql).toContain("FORWARDING_CHANNEL_PREPARED_BY_PERSON");
    expect(sql).toContain("person_declared_sent");
    expect(sql).not.toContain("saaevr.com.br");
    expect(sql).not.toContain("light.com.br");
    expect(sql).not.toContain("voltaredonda.rj.gov.br");
    expect(sql).not.toMatch(/https?:\/\//);
    expect(sql).not.toMatch(/tel:/);
  });

  it("keeps photo-only classification on the same case with append-only history", () => {
    expect(sql).toContain(
      "create table private.comun_relata_classification_events",
    );
    expect(sql).toContain("COMUN_RELATA_CLASSIFICATION_EVENTS_APPEND_ONLY");
    expect(sql).toContain("v_context.report_id");
    expect(sql).toContain("v_context.case_id");
    expect(sql).toContain("previous_text_absent");
  });

  it("revokes every new RPC from browser roles", () => {
    for (const name of [
      "comun_relata_classification_transition",
      "comun_essential_wallet_mark_ready",
      "comun_essential_assisted_prepare",
      "comun_assisted_wallet_item_category",
      "comun_assisted_forwarding_list",
      "comun_assisted_forwarding_open",
      "comun_assisted_forwarding_declare_sent",
      "comun_assisted_forwarding_record_response",
      "comun_assisted_forwarding_withdraw",
    ]) {
      expect(sql).toContain(`revoke all on function public.${name}`);
    }
  });
});
