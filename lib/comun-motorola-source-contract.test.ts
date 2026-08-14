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
      "app/comun/participar/page.tsx",
      "lib/sidewalk-miniapp-definition.ts",
    ]) {
      expect(source(path), path).not.toContain(
        "/comun/mapa/contribuir?origem=calcadas",
      );
    }
  });

  it("não seleciona semanticamente um problema de ônibus por padrão", () => {
    const bus = source("components/comun-bus-relata-intake.tsx");
    expect(bus).toContain("useState<ComunBusIssueType | null>(null)");
    expect(bus).toContain("Adicionar detalhes (opcional)");
    expect(bus).toContain("aria-expanded={detailsOpen}");
    expect(bus).not.toContain(
      'useState<ComunBusIssueType>("delay_or_not_passed")',
    );
  });

  it("mantém Participar disponível pela entrada canônica de Pautas", () => {
    const navigation = source("components/comun-navigation.tsx");
    const controls = source("components/comun-experience-controls.tsx");
    expect(navigation).toContain('["Participar", "/comun/pautas"');
    // A folha legada continua disponível como compatibilidade, sem competir
    // com a entrada principal da experiência canônica.
    expect(controls).toContain('href={withComunAppV2("/comun/participar"');
  });

  it("só inicia as navegações da Home depois do gesto da pessoa", () => {
    const home = source("components/comun-app-v2-home.tsx");
    expect(home).toContain(
      "href={withComunAppV2(COMUN_MOTOROLA_PRIMARY_ACTION.href)}\n        prefetch={false}",
    );
    expect(home).toContain(
      "href={withComunAppV2(href)}\n      prefetch={false}",
    );
  });
});
