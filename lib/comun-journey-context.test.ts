import { describe, expect, it } from "vitest";
import {
  parseComunJourneyContext,
  resolveComunJourneyReturn,
  withComunJourneyContext,
} from "@/lib/comun-journey-context";

const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);

describe("ComunJourneyContext", () => {
  it("preserva somente contexto semântico e allowlisted", () => {
    const href = withComunJourneyContext(
      "/comun/mapa/contribuir?experiencia=app-v2",
      {
        intent: "register_sidewalk",
        sourceRoute: "/comun/participar?experiencia=app-v2",
        pautaSlug: "calcadas-em-circulacao",
        territorySlug: "volta-redonda",
        currentStage: "participate",
        trackingRoute: "/comun/minha-participacao?secao=participacoes",
      },
      NOW,
    );
    const parsed = parseComunJourneyContext(
      new URL(href, "http://comun.local").searchParams,
      NOW,
    );
    expect(parsed).toMatchObject({
      intent: "register_sidewalk",
      sourceRoute: "/comun/participar?experiencia=app-v2",
      pautaSlug: "calcadas-em-circulacao",
      territorySlug: "volta-redonda",
      currentStage: "participate",
    });
    expect(href).not.toContain("contributionId");
  });

  it("bloqueia URL externa, rota administrativa e payload adulterado", () => {
    const parsed = parseComunJourneyContext(
      new URLSearchParams({
        intencao: "drop-table",
        origem: "https://example.com/roubo",
        returnTo: "/comun/admin/operacao",
        pauta: "../segredo",
        comunidade: "Outra_Comunidade",
        acompanhar: "//example.com",
      }),
      NOW,
    );
    expect(parsed).toEqual({
      intent: undefined,
      sourceRoute: undefined,
      returnTo: undefined,
      pautaSlug: undefined,
      communitySlug: undefined,
      territorySlug: undefined,
      currentStage: undefined,
      trackingRoute: undefined,
      expiresAt: undefined,
    });
  });

  it("descarta integralmente um contexto expirado ou com validade impossível", () => {
    expect(
      parseComunJourneyContext(
        new URLSearchParams({
          intencao: "contribute_pauta",
          pauta: "mobilidade",
          contextoAte: String(Math.floor(NOW / 1000) - 1),
        }),
        NOW,
      ),
    ).toEqual({});
    expect(
      withComunJourneyContext(
        "/comun/participar?intencao=privacy_report&pauta=segredo",
        {
          intent: "contribute_pauta",
          expiresAt: Math.floor(NOW / 1000) - 1,
        },
        NOW,
      ),
    ).toBe("/comun/participar");
    expect(
      parseComunJourneyContext(
        new URLSearchParams({
          intencao: "contribute_pauta",
          contextoAte: String(Math.floor(NOW / 1000) + 172_800),
        }),
        NOW,
      ),
    ).toEqual({});
  });

  it("prioriza origem explícita, depois retorno, entidade e root", () => {
    expect(
      resolveComunJourneyReturn(
        {
          sourceRoute: "/comun/caixa-de-entrada?visao=prioridade",
          returnTo: "/comun/minha-participacao",
        },
        "/comun/pautas/mobilidade",
      ),
    ).toBe("/comun/caixa-de-entrada?visao=prioridade");
    expect(resolveComunJourneyReturn({}, "/comun/pautas/mobilidade")).toBe(
      "/comun/pautas/mobilidade",
    );
  });
});
