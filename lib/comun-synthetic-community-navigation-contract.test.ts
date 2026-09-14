import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("synthetic community navigation boundary", () => {
  it("returns legacy Pauta pages to the public Pauta directory", () => {
    const appBar = read("components/comun-mobile-app-bar.tsx");

    expect(appBar).toContain(
      '[/\\/pautas\\//, "Pauta", "Processo comunitário", "/comun/pautas"]',
    );
    expect(appBar).not.toContain(
      '[/\\/pautas\\//, "Pauta", "Processo comunitário", "/comun/c/cidade"]',
    );
  });

  it("keeps Calçadas memory in territory, Pauta and tool context", () => {
    const memoryPage = read(
      "app/comun/pautas/[slug]/memoria/[memorySlug]/page.tsx",
    );

    expect(memoryPage).toContain('label: "Volta Redonda"');
    expect(memoryPage).toContain('label: "Calçadas em circulação"');
    expect(memoryPage).toContain('label: "Mapa das Calçadas"');
    expect(memoryPage).not.toContain('href: "/comun/c/cidade"');
  });
});
