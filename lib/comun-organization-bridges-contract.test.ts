import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const bridge = readFileSync(
  join(root, "lib/comun-organization-bridges.ts"),
  "utf8",
);
const panorama = readFileSync(
  join(root, "components/comun-city-panorama.tsx"),
  "utf8",
);
const pautasPage = readFileSync(
  join(root, "app/comun/pautas/page.tsx"),
  "utf8",
);
const pautas = readFileSync(
  join(root, "components/comun-pautas-vivas.tsx"),
  "utf8",
);
const preflight = readFileSync(
  join(root, ".github/workflows/comun-48-3-e2-preflight.yml"),
  "utf8",
);
const disposable = readFileSync(
  join(root, ".github/workflows/comun-48-3-e2-disposable.yml"),
  "utf8",
);

describe("COMUN 48.3-E2 integration contract", () => {
  it("uses one exact batched evidence relation without search or fuzzy matching", () => {
    expect(bridge).toContain('.in("public_evidence_ref_id", refs)');
    expect(bridge.match(/\.from\("comun_pauta_evidence_items"\)/g)).toHaveLength(
      1,
    );
    expect(bridge).toContain('.eq("source_type", "public_evidence")');
    expect(bridge).toContain('.eq("status", "approved")');
    expect(bridge).toContain('.eq("sensitivity", "public_safe")');
    expect(bridge).not.toMatch(
      /\.ilike\(|search_documents|embedding|similarity|\.eq\("(?:title|category)"/i,
    );
  });

  it("keeps the bridge read-only and preserves the explicit attach helper", () => {
    expect(bridge).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
    expect(bridge).not.toContain("attachPublicEvidenceToPauta");
    expect(panorama).not.toContain("Criar pauta");
    expect(pautas).not.toContain("Criar pauta");
  });

  it("adds contextual links without a new route, API, flag or primary action", () => {
    expect(panorama).toContain("Ver pauta relacionada");
    expect(panorama).toContain("pautas relacionadas");
    expect(panorama).toContain("data-comun-organization-bridge");
    expect(panorama.match(/data-comun-primary-action/g)).toHaveLength(1);
    expect(pautasPage).toContain("params.evidencia");
    expect(pautas).toContain("Pautas relacionadas a esta evidência");
    expect(pautas.match(/Ver fonte no COMUN/g)?.length).toBeGreaterThanOrEqual(2);
    expect(pautas).toContain("Esta referência pública não está disponível.");
    expect(pautas).toContain("Ainda não há pauta pública ligada a esta evidência.");
  });

  it("keeps Relata and private markers outside the bridge", () => {
    expect(bridge).not.toMatch(
      /comun_reports|comun_relata_cases|receipt|wallet|private_location|attachment|forwarding|original_text/i,
    );
  });

  it("proves metadata-only preflight, an empty remote plan and rolled-back fixtures", () => {
    expect(preflight).toContain("begin read only;");
    expect(preflight).toContain("businessContentRead=false");
    expect(preflight).toContain("migrationCount=0");
    expect(preflight).toContain("supabase db push");
    expect(preflight).toContain("--dry-run");
    expect(preflight).not.toMatch(/--include-all|migration repair|db reset/i);
    expect(disposable).toContain("begin;");
    expect(disposable).toContain("rollback;");
    expect(disposable).toContain("currentVersionRelations=1");
    expect(disposable).toContain("historicalVersionRelations=1");
    expect(disposable).toContain("automaticPautasCreated=0");
    expect(disposable).toContain("businessWritesAfterRollback=0");
  });
});
