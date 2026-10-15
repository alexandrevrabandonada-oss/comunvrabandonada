import React from "react";
import { renderToReadableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  solidarityConnectionHref,
  solidarityJourneyReturnHref,
} from "./comun-solidarity-connection-navigation";
const fixture = vi.hoisted(() => ({ directory: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/comun-solidarity-economy-directory", () => ({
  getPublicSolidarityEconomyDirectory: fixture.directory,
}));
vi.mock("@/lib/popular-map", () => ({
  listPublicMapData: async () => ({ items: [] }),
}));
vi.mock("@/components/comun-shell", () => ({
  ComunShell: ({ children }: any) => children,
  Section: ({ children }: any) => children,
}));
import Directory from "@/app/comun/cooperativas/page";
async function markup(element: React.ReactNode) {
  const stream = await renderToReadableStream(element);
  return new Response(stream).text();
}
const flags = [
  "COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED",
  "COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED",
  "COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED",
];
beforeEach(() => {
  flags.forEach((name) => vi.stubEnv(name, "enabled"));
  const organization = {
    territoryId: "synthetic",
    slug: "organizacao-lab",
    publicName: "Organização sintética",
    services: [],
  };
  fixture.directory.mockResolvedValue({
    sourceState: "available",
    offers: [
      {
        id: "offer",
        slug: "oferta-lab",
        title: "Livros",
        summary: "Livros públicos",
        organization,
        modalities: ["donation"],
        priceAmountCents: null,
        validUntil: "2099-01-01T00:00:00Z",
      },
    ],
    needs: [
      {
        id: "need",
        slug: "necessidade-lab",
        title: "Organizar livros",
        summary: "Ajuda pública",
        organization,
      },
      {
        id: "territorial",
        slug: "sem-organizacao",
        title: "Contexto territorial",
        summary: "Não cria conexão",
        organization: null,
      },
    ],
    organizations: [],
    limitations: [],
  });
});
describe("SOC-D08 public navigation", () => {
  it("carries only allowlisted experience/origin, never a caller URL or private query", () => {
    const href = solidarityConnectionHref(
      "offer",
      "organizacao-lab",
      "oferta-lab",
      {
        experiencia: "legacy",
        origem: "feirinha",
        returnTo: "https://evil.invalid",
        token: "PRIVATE",
      } as any,
    );
    expect(href).toBe(
      "/comun/cooperativas/organizacao-lab/ofertas/oferta-lab/interesse?origem=feirinha&experiencia=legacy",
    );
    expect(
      solidarityJourneyReturnHref("organizacao-lab", {
        experiencia: "legacy",
        origem: "feirinha",
      }),
    ).toBe("/comun/cooperativas?experiencia=legacy");
    expect(
      solidarityJourneyReturnHref("organizacao-lab", {
        origem: "https://evil.invalid",
      }),
    ).toBe("/comun/cooperativas/organizacao-lab");
    expect(solidarityConnectionHref("need", "../admin", "need")).toBe(
      "/comun/cooperativas",
    );
  });
  it("real directory cards link only organization-backed public items", async () => {
    const html = await markup(
      await Directory({
        searchParams: Promise.resolve({ experiencia: "legacy" }),
      }),
    );
    expect(html).toContain(
      "ofertas/oferta-lab/interesse?origem=feirinha&amp;experiencia=legacy",
    );
    expect(html).toContain(
      "necessidades/necessidade-lab/ajudar?origem=feirinha&amp;experiencia=legacy",
    );
    expect(html).not.toContain("sem-organizacao/ajudar");
    expect(html).toContain("Tenho interesse");
    expect(html).toContain("Posso ajudar");
  });
  it.each(flags)(
    "does not offer connection when prerequisite %s is off",
    async (flag) => {
      vi.stubEnv(flag, "disabled");
      const html = await markup(await Directory({}));
      expect(html).not.toContain("/interesse");
      expect(html).not.toContain("/ajudar");
    },
  );
});
