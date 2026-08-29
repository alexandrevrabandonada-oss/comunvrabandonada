import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("COMUN 48.6 Adoption-03 post-report Motorola", () => {
  it("keeps the receipt summary to one primary next action", () => {
    const capture = read("app/comun/relatar/quick-capture-v2.tsx");
    const receipt = capture.slice(capture.indexOf(') : (\n            <>'));

    expect(capture).toContain('"summary" | "next_action"');
    expect(receipt).toContain('onClick={showNextAction}');
    expect(receipt).toContain(">\n                      Continuar\n                    </button>");
    expect(receipt.indexOf("Código de recuperação")).toBeLessThan(
      receipt.indexOf("<RelataEvidencePanel"),
    );
    expect(receipt).toContain("Nada foi enviado. Nada foi publicado.");
  });

  it("does not show education channels before a conscious network choice", () => {
    const panel = read(
      "app/comun/relatar/comun-education-channels-panel.tsx",
    );

    expect(panel).toContain(
      'type Network = "unanswered" | "municipal" | "state" | "unknown"',
    );
    expect(panel).toContain('useState<Network>("unanswered")');
    expect(panel).toContain('if (network === "unanswered") return false;');
    expect(panel).toContain("A escola é municipal, estadual ou você não sabe?");
    expect(panel).toContain("Canal oficial verificado");
    expect(panel).toContain("O COMUN ainda não testou o envio por este canal.");
  });

  it("keeps advanced guidance and evidence closed by default", () => {
    const guide = read(
      "app/comun/relatar/comun-denuncias-routing-guide-panel.tsx",
    );
    const evidence = read("app/comun/relata/relata-evidence-panel.tsx");

    expect(guide).toContain("Ver orientações completas");
    expect(guide).toContain("<details className=");
    expect(guide).not.toContain("<details open");
    expect(evidence).toContain("useState(false)");
    expect(evidence).toContain("Quer fortalecer este relato?");
    expect(evidence).toContain("Adicionar detalhes");
    expect(evidence).not.toContain("Agrupamento");
  });

  it("does not change routing, channels, persistence, or schema", () => {
    const changedSurface = [
      "app/comun/relatar/quick-capture-v2.tsx",
      "app/comun/relatar/comun-education-channels-panel.tsx",
      "app/comun/relatar/comun-denuncias-routing-guide-panel.tsx",
      "app/comun/relata/relata-evidence-panel.tsx",
    ];
    const catalog = read(
      "lib/server/comun-education-institutional-channel-catalog.ts",
    );

    expect(changedSurface).toHaveLength(4);
    expect(catalog).toContain("Secretaria Municipal de Educação de Volta Redonda");
    expect(catalog).toContain("SEEDUC-RJ / OuvERJ");
    expect(
      readdirSync(join(root, "supabase/migrations")).filter((name) =>
        /adoption-03|post-report-motorola/i.test(name),
      ),
    ).toEqual([]);
  });
});
