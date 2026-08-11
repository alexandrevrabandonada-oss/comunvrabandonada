import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

describe("48.2-B sidewalk observatory public contract", () => {
  it("keeps the API read-only and distinguishes unavailable data", async () => {
    const api = await source("../app/api/comun/observatorios/calcadas/route.ts");
    expect(api).toContain('code: "source_unavailable"');
    expect(api).toContain("status: 503");
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(api).toContain(`export const ${method} = methodNotAllowed`);
    }
    expect(api).toContain('allow: "GET, HEAD"');
  });

  it("cloaks the dedicated route behind the analytics flag and keeps the public registry in sync", async () => {
    const page = await source("../app/comun/observatorios/calcadas/page.tsx");
    const registryApi = await source("../app/api/comun/observatorios/route.ts");
    expect(page).toContain("isComunObservatorySidewalkAnalyticsEnabled");
    expect(page).toContain("notFound()");
    expect(page).toContain(
      "Os dados de Calçadas estão temporariamente indisponíveis.",
    );
    expect(page).toContain(
      "Não há pontos revisados publicados neste momento.",
    );
    expect(registryApi).toContain("isComunObservatorySidewalkAnalyticsEnabled");
    expect(registryApi).toMatch(
      /getPublicObservatoryRegistry\([\s\S]*isComunObservatorySidewalkAdapterEnabled\(\)[\s\S]*isComunObservatorySidewalkAnalyticsEnabled\(\)[\s\S]*\)/,
    );
  });

  it("provides keyboard-visible filters, textual equivalence and non-color labels", async () => {
    const ui = await source("../components/comun-sidewalk-observatory.tsx");
    const map = await source("../components/comun-sidewalk-observatory-map.tsx");
    expect(ui).toContain("Pontos mostrados");
    expect(ui).toContain('aria-live="polite"');
    expect(ui).toContain("focus-visible:outline");
    expect(ui).toContain("Mapa, lista e contadores usam a mesma seleção.");
    expect(ui).toContain("Distribuição por condição");
    expect(ui).toContain("Problemas observados");
    expect(ui).toContain("Sem classificação");
    expect(ui).toContain("sm:grid-cols");
    expect(ui).not.toContain("overflow-x-auto");
    expect(map).toContain('role="region"');
    expect(map).toContain("localização aproximada");
  });

  it("does not introduce neighborhood inference, historical series or private field exposure", async () => {
    const files = await Promise.all([
      source("./comun-sidewalk-observatory.ts"),
      source("./comun-observatory-sidewalk-adapter.ts"),
      source("../components/comun-sidewalk-observatory.tsx"),
      source("../components/comun-sidewalk-observatory-map.tsx"),
      source("../app/api/comun/observatorios/calcadas/route.ts"),
    ]);
    const joined = files.join("\n");
    expect(joined).not.toMatch(
      /reverse.?geocod|neighborhood.*rank|private_geometry_geojson|original_text|report_id|case_id|account_id|forwarding_status|participation_wallet/i,
    );
    expect(joined).not.toMatch(/problemas por mês|problems by month/i);
  });

  it("keeps the permanent non-census language and unified Relata CTA", async () => {
    const ui = await source("../components/comun-sidewalk-observatory.tsx");
    expect(ui).toMatch(
      /Não são um levantamento completo de todas as calçadas da\s+cidade\./,
    );
    expect(ui).toContain('href="/comun/relatar"');
    expect(ui).toContain("Publicação");
    expect(ui).toContain("automática continua desligada");
  });

  it("locks the merge-triggered flags-off rollout and keeps Wave 1 explicitly dispatched", async () => {
    const workflow = await source(
      "../.github/workflows/comun-48-2-b-activation.yml",
    );
    const runner = await source(
      "../scripts/observatories/run-48-2-b-production-wave.sh",
    );
    const combined = `${workflow}\n${runner}`;

    expect(workflow).toContain("push:");
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain(
      '".github/workflows/comun-48-2-b-activation.yml"',
    );
    expect(workflow).toContain("auto-flags-off:");
    expect(workflow).toContain("git diff --diff-filter=A");
    expect(workflow).toContain(
      "run-48-2-b-production-wave.sh flags-off",
    );
    expect(workflow).not.toContain("auto-wave1-sidewalk-analytics:");
    expect(workflow).toContain("manual-recovery-or-replay:");
    expect(workflow).toContain('MODE: ${{ inputs.mode }}');
    expect(workflow).toContain(
      "options: [flags-off, wave1-sidewalk-analytics]",
    );

    expect(runner).toContain(
      "set_vercel_flag COMUN_OBSERVATORIES_FOUNDATION_ENABLED enabled",
    );
    expect(runner).toContain(
      "set_vercel_flag COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED enabled",
    );
    expect(runner).toContain(
      "set_vercel_flag COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED disabled",
    );
    expect(runner).toContain(
      "set_vercel_flag COMUN_OBSERVATORY_SIDEWALK_ANALYTICS_ENABLED enabled",
    );
    expect(runner).toContain("wave1-sidewalk-analytics");
    expect(runner).toContain("restore_48_2_a_baseline");
    expect(runner).toContain(
      "COMUN_48_2_B_FLAGS_OFF_PRODUCTION_48_2_A_GREEN",
    );
    expect(runner).toContain(
      "COMUN_48_2_B_WAVE1_PRODUCTION_REVIEWED_ONLY_GREEN",
    );
    expect(runner).toContain("businessWrites=0");
    expect(combined).not.toMatch(/psql|supabase\s+(db|migration|functions)/i);

    if (process.platform !== "win32") {
      execFileSync("bash", [
        "-n",
        "scripts/observatories/run-48-2-b-production-wave.sh",
      ]);
    }
  });

  it("keeps the Production browser proof read-only and checks map/list/filter equivalence", async () => {
    const proof = await source(
      "../scripts/observatories/verify-sidewalk-observatory-production.mjs",
    );
    expect(proof).toContain("condition map marker count");
    expect(proof).toContain("problem map marker count");
    expect(proof).toContain("recency map marker count");
    expect(proof).toContain("mobile observatory must not overflow horizontally");
    expect(proof).toContain("businessWrites: 0");
    expect(proof).not.toMatch(/request\.(post|put|patch|delete)|fetch\([^\n]+method:/i);
  });
});
