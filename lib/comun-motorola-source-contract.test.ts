import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("contratos de fonte do Motorola Pass", () => {
  it("não devolve CTAs canônicos de Calçadas ao intake legado", () => {
    for (const path of [
      "components/comun-app-v2-home.tsx",
      "components/sidewalk-miniapp-shell.tsx",
      "lib/sidewalk-miniapp-definition.ts",
    ]) {
      expect(source(path), path).not.toContain(
        "/comun/mapa/contribuir?origem=calcadas",
      );
    }
  });

  it("não seleciona semanticamente um problema de ônibus por padrão", () => {
    const bus = source("components/comun-bus-relata-intake.tsx");
    expect(bus).toContain(
      "useState<ComunBusIssueType | null>(null)",
    );
    expect(bus).toContain("Adicionar detalhes (opcional)");
    expect(bus).toContain("aria-expanded={detailsOpen}");
    expect(bus).not.toContain(
      'useState<ComunBusIssueType>("delay_or_not_passed")',
    );
  });

  it("mantém Participar disponível fora do gesto central mobile", () => {
    const navigation = source("components/comun-navigation.tsx");
    const controls = source("components/comun-experience-controls.tsx");
    expect(navigation).toContain('["Participar", "/comun/participar"');
    expect(controls).toContain('href={withComunAppV2("/comun/participar"');
  });
});
