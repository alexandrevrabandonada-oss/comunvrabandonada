import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("COMUN P6B-A release contract", () => {
  it("adds no migration or environmental miniapp", () => {
    const migrations = readdirSync("supabase/migrations").filter((name) =>
      /p6b|environmental_incident/i.test(name),
    );
    expect(migrations).toEqual([]);
    const page = read("app/comun/relatar/page.tsx");
    expect(page).toContain("<QuickCaptureV2");
    expect(page).not.toMatch(/comun\/(queimadas|poluicao|lixo)/);
  });

  it("keeps raw matched signals out of the browser decision and API logs", () => {
    const router = read("lib/comun-relata-routing.ts");
    const api = read("app/api/comun/relata/route.ts");
    const runtime = read(
      "scripts/solo/rehearse-p6b-a-environmental-incidents-local.mjs",
    );
    expect(router).not.toMatch(/matchedSignals:\s*environmental/);
    expect(api).not.toMatch(/console\.(log|error).*\b(text|body|decision)\b/);
    expect(runtime).toContain("external request refused");
    expect(runtime).toContain("hardDeletes");
  });

  it("keeps forwarding disabled independently from classification", () => {
    const flags = read("lib/comun-environmental-incidents-feature.ts");
    const catalog = read(
      "lib/server/comun-environmental-channel-catalog.ts",
    );
    expect(flags).toContain(
      '"COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED"',
    );
    expect(flags).toMatch(
      /isComunEnvironmentalForwardingAssistedEnabled[\s\S]*return false/,
    );
    expect(catalog).toContain("automationAllowed: false");
    expect(catalog).not.toMatch(/Fiscaliza VR.*fallback/i);
  });

  it("preserves category-aware Wallet labels and fail-closed presentation", () => {
    const wallet = read("lib/comun-wallet-relata-action.ts");
    expect(wallet).toContain('active_fire: "Fogo ou incêndio ativo"');
    expect(wallet).toContain(
      'smoke_or_environmental_trace: "Fumaça ou vestígio ambiental"',
    );
    expect(wallet).toContain('waste_or_debris: "Lixo ou entulho"');
    expect(wallet).toContain(
      'environmental_pollution: "Poluição ambiental"',
    );
    expect(wallet).toContain('baseAction("no_verified_forwarding"');
  });

  it("accepts the typed unknown-flames answer without making it blocking", () => {
    const api = read("app/api/comun/relata/route.ts");
    const question = read("lib/comun-environmental-routing-v2.ts");
    expect(api).toContain('["sim", "nao", "nao_sei"]');
    expect(question).toContain('{ value: "nao_sei", label: "Não sei" }');
    expect(question).toContain("blocking: false");
  });
});
