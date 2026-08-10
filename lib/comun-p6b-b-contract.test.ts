import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("COMUN P6B-B release contract", () => {
  it("contains exactly one scoped P6B-B migration and no miniapp", () => {
    const migrations = readdirSync("supabase/migrations").filter((name) =>
      /comun_flood_drainage_tree_categories/.test(name),
    );
    expect(migrations).toHaveLength(1);
    const sql = read(`supabase/migrations/${migrations[0]}`);
    expect(sql).toContain("urban_flooding");
    expect(sql).toContain("stormwater_drainage");
    expect(sql).toContain("tree_hazard");
    expect(sql).not.toMatch(/create table|source_domain|public_snapshot|backfill/i);
    expect(read("app/comun/relatar/page.tsx")).not.toMatch(
      /comun\/(alagamentos|drenagem|arvores)/,
    );
  });

  it("keeps forwarding disabled and institutional entries outside SQL", () => {
    const feature = read("lib/comun-urban-incidents-feature.ts");
    const catalog = read("lib/server/comun-urban-incident-channel-catalog.ts");
    const sql = read(
      `supabase/migrations/${readdirSync("supabase/migrations").find((name) => /comun_flood_drainage_tree_categories/.test(name))}`,
    );
    expect(feature).toMatch(
      /isComunUrbanIncidentsForwardingAssistedEnabled[\s\S]*return false/,
    );
    expect(catalog).toContain("automationAllowed: false");
    expect(sql).not.toMatch(/tel:|https?:\/\/|Fiscaliza|Defesa Civil/i);
  });

  it("accepts typed optional answers and never exposes matched signals", () => {
    const api = read("app/api/comun/relata/route.ts");
    const router = read("lib/comun-relata-routing.ts");
    expect(api).toContain('"flood_active_risk"');
    expect(api).toContain('"tree_state"');
    expect(router).not.toMatch(/matchedSignals:\s*urban/);
  });

  it("preserves the paused human pilot contract", () => {
    const state = read("reports/current/estado-atual-comun.md");
    expect(state).toContain(
      "COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION",
    );
  });

  it("gates exact-one promotion and keeps Production forwarding off", () => {
    const promotion = read(".github/workflows/comun-p6b-b-promotion.yml");
    const activation = read(".github/workflows/comun-p6b-b-activation.yml");
    expect(promotion).toContain("COMUN_P6B_B_REMOTE_PLAN_EXACT_ONE");
    expect(promotion).not.toMatch(/supabase db push[^\n]*--include-all/);
    expect(promotion).not.toMatch(/supabase migration repair/);
    expect(promotion).not.toMatch(/supabase db reset/);
    expect(activation).toMatch(
      /COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_ENABLED production[\s\S]*disabled/,
    );
    expect(activation).toContain("COMUN_48_1B_P6B_B_FLOOD_DRAINAGE_TREE_DOMAIN_GREEN_NO_AUTO_SEND");
  });
});
