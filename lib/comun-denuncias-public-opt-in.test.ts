import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMUN_DENUNCIAS_PUBLIC_ENTRY_URL,
  COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES,
  buildComunDenunciasSafeShareData,
  isComunPublicProjectionOptInCategory,
} from "./comun-denuncias-public-opt-in";

describe("public projection opt-in", () => {
  it("keeps the Production opt-in allowlist narrow and explicit", () => {
    expect(COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES).toEqual([
      "public_lighting",
      "power_distribution",
      "smoke_or_environmental_trace",
    ]);
    expect(isComunPublicProjectionOptInCategory("public_health")).toBe(false);
    expect(isComunPublicProjectionOptInCategory("active_fire")).toBe(false);
    expect(isComunPublicProjectionOptInCategory("child_protection")).toBe(
      false,
    );
  });

  it("connects the post-report receipt to the existing wallet consent panel", () => {
    const capture = readFileSync(
      resolve(process.cwd(), "app/comun/relatar/quick-capture-v2.tsx"),
      "utf8",
    );

    expect(capture).toContain(
      'import { PublicProjectionConsentPanel } from "@/app/comun/minha-participacao/public-projection-consent-panel";',
    );
    expect(capture).toContain(
      'import { isComunPublicProjectionOptInCategory } from "@/lib/comun-denuncias-public-opt-in";',
    );
    expect(capture).toContain(
      "<PublicProjectionConsentPanel walletItemId={walletItemId} />",
    );
    expect(capture).toContain('receipt.state !== "withdrawn"');
  });

  it("keeps consent on the existing server-owned endpoint", () => {
    const panel = readFileSync(
      resolve(
        process.cwd(),
        "app/comun/minha-participacao/public-projection-consent-panel.tsx",
      ),
      "utf8",
    );

    expect(panel).toContain(
      "/api/comun/denuncias/public-projection-consent?walletItemId=",
    );
    expect(panel).not.toMatch(
      /caseId|reportId|collective_case_id|membership_id/,
    );
  });

  it("offers only the generic public Denúncias URL for sharing", () => {
    expect(buildComunDenunciasSafeShareData()).toEqual({
      url: COMUN_DENUNCIAS_PUBLIC_ENTRY_URL,
    });
    expect(JSON.stringify(buildComunDenunciasSafeShareData())).not.toMatch(
      /protocol|walletItemId|recovery|report|location|category/i,
    );
  });

  it("keeps the collective value after saving without turning consent into a prerequisite", () => {
    const capture = readFileSync(
      resolve(process.cwd(), "app/comun/relatar/quick-capture-v2.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      resolve(
        process.cwd(),
        "app/comun/minha-participacao/public-projection-consent-panel.tsx",
      ),
      "utf8",
    );

    expect(capture).toMatch(/Você pode pular\s+esta etapa\./);
    expect(capture).toContain('className="min-h-12 border-2');
    expect(panel).toMatch(/Hoje seu\s+relato não entra em mapa público\./);
    expect(panel).toContain("Isso não parece ser um caso isolado.");
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain("Seu relato não vai junto.");
  });

  it("keeps blocked categories out of the collective prompt contract", () => {
    for (const category of [
      "active_fire",
      "public_health",
      "public_education",
      "child_protection",
      "workplace",
      "other",
    ]) {
      expect(isComunPublicProjectionOptInCategory(category)).toBe(false);
    }
  });
});
