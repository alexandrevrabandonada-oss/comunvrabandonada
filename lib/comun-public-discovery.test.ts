import { describe, expect, it } from "vitest";
import { summarizeDiscoveryPresentation } from "./public-discovery-presentation";
import {
  archiveDiscovery,
  radioDiscovery,
  solidarityDiscovery,
  discoveryItemHref,
  discoveryReturnHref,
} from "./comun-public-discovery";
const archive = {
  slug: "memoria-local",
  item_type: "photograph",
  status: "published",
  visibility: "public",
  title: "Memória da praça",
  summary: "Uma fotografia e sua história.",
  credits: "Acervo comunitário",
  rights_status: "licensed",
  published_at: "2026-10-01T12:00:00Z",
  city: "Volta Redonda",
  object_key: "PRIVATE",
  user_id: "PRIVATE",
};
const offer = {
  slug: "troca-local",
  title: "Troca de livros",
  summary: "Livros em circulação.",
  validUntil: "2099-01-01T00:00:00Z",
  organization: { slug: "roda-local", publicName: "Roda local" },
};
describe("SOC-D09 public discovery contract", () => {
  it("caps each source and projects an explicit safe allowlist", () => {
    const result = archiveDiscovery({
      state: "ready",
      items: [archive, { ...archive, slug: "outra-memoria" }, archive],
    });
    expect(result.items).toHaveLength(2);
    expect(Object.keys(result.items[0]).sort()).toEqual(
      [
        "title",
        "summary",
        "path",
        "attribution",
        "context",
        "dateTime",
        "dateLabel",
        "rights",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
  it.each([
    { status: "draft" },
    { visibility: "private" },
    { rights_status: "unknown" },
    { item_type: "radio_episode" },
    { slug: "smoke-local" },
    { published_at: null },
    { summary: null },
    { credits: "", source_name: null },
  ])("omits ineligible archive %j", (patch) => {
    expect(
      archiveDiscovery({ state: "ready", items: [{ ...archive, ...patch }] })
        .state,
    ).toBe("empty");
  });
  it.each([
    "person@example.org",
    "access_token=private",
    "Telefone 21999998888",
    "https://private.invalid",
  ])("refuses sensitive summary %s", (summary) =>
    expect(
      archiveDiscovery({ state: "ready", items: [{ ...archive, summary }] })
        .items,
    ).toEqual([]),
  );
  it("distinguishes empty from unavailable and rejects partial data", () => {
    expect(archiveDiscovery({ state: "empty", items: [] }).state).toBe("empty");
    expect(
      archiveDiscovery({ state: "unavailable", items: [archive] }),
    ).toEqual({ kind: "acervo", state: "unavailable", items: [] });
    expect(
      radioDiscovery({ state: "unavailable", programs: [], episodes: [] }),
    ).toEqual({ kind: "radio", state: "unavailable", items: [] });
  });
  it("requires the eligible public program and complete episode", () => {
    const episode = {
      program_item_id: "p",
      slug_public: "escuta-local",
      title_public: "Escuta",
      summary_public: "Uma conversa pública.",
      published_at: "2026-10-01",
    };
    expect(
      radioDiscovery({ state: "ready", programs: [], episodes: [episode] })
        .state,
    ).toBe("empty");
    expect(
      radioDiscovery({
        state: "ready",
        programs: [{ archive_item_id: "p", title_public: "Vozes" }],
        episodes: [episode],
      }).items[0].attribution,
    ).toBe("Programa: Vozes");
  });
  it("requires flags, eligible organization and a future deadline", () => {
    expect(
      solidarityDiscovery(
        { sourceState: "available", offers: [offer], needs: [] },
        true,
      ).items,
    ).toHaveLength(1);
    for (const item of [
      { ...offer, organization: null },
      { ...offer, validUntil: "2000-01-01" },
    ])
      expect(
        solidarityDiscovery(
          { sourceState: "available", offers: [item], needs: [] },
          true,
        ).items,
      ).toEqual([]);
    expect(
      solidarityDiscovery(
        { sourceState: "available", offers: [offer], needs: [] },
        false,
      ).state,
    ).toBe("unavailable");
  });
  it("keeps only allowlisted local public handles and context", () => {
    const href = discoveryItemHref(
      "/comun/cooperativas/roda-local?oferta=troca-local&access_token=SECRET&returnTo=https://evil.invalid#secret",
      "app-v2",
      "feirinha",
    );
    expect(href).toContain("oferta=troca-local");
    expect(href).toContain("origem=descoberta");
    expect(href).not.toMatch(/SECRET|evil|secret|returnTo/);
    expect(
      discoveryItemHref("https://evil.invalid/comun/acervo/a", "app-v2"),
    ).toBe("/comun/explorar");
    expect(discoveryItemHref("http://[", "app-v2")).toBe("/comun/explorar");
    expect(discoveryItemHref("/comun/admin/a", "app-v2")).toBe(
      "/comun/explorar",
    );
  });
  it("external direct entry never manufactures a return context", () => {
    expect(discoveryReturnHref({})).toBeNull();
    expect(
      discoveryReturnHref({
        origem: "descoberta",
        categoria: "https://evil.invalid",
      }),
    ).toBe("/comun/explorar");
    expect(
      discoveryReturnHref({ origem: "descoberta", categoria: "radio" }),
    ).toBe("/comun/explorar?categoria=radio");
  });
});

describe("SOC-D10 first-visit public discovery status", () => {
  const source = (
    kind: "acervo" | "radio" | "feirinha",
    state: "ready" | "empty" | "unavailable",
  ) => ({
    kind,
    state,
    items: state === "ready" ? [{ title: "Conteúdo elegível" }] : [],
  });

  it("reports honest emptiness when all verified sources are empty", () => {
    const summary = summarizeDiscoveryPresentation([
      source("acervo", "empty"),
      source("radio", "empty"),
      source("feirinha", "empty"),
    ]);
    expect(summary.state).toBe("empty");
    expect(summary.unavailable).toBe(false);
    expect(summary.groups).toEqual([]);
  });

  it("does not turn unavailable sources into an empty catalogue", () => {
    const summary = summarizeDiscoveryPresentation([
      source("acervo", "unavailable"),
      source("radio", "unavailable"),
      source("feirinha", "empty"),
    ]);
    expect(summary.state).toBe("unavailable");
    expect(summary.groups).toEqual([]);
  });

  it("preserves verified content and explicitly flags partial unavailability", () => {
    const summary = summarizeDiscoveryPresentation([
      source("acervo", "ready"),
      source("radio", "unavailable"),
    ]);
    expect(summary.state).toBe("ready");
    expect(summary.groups).toHaveLength(1);
    expect(summary.unavailable).toBe(true);
  });

  it("scopes availability to the selected public source only", () => {
    const sources = [source("acervo", "ready"), source("radio", "unavailable")];
    expect(summarizeDiscoveryPresentation(sources, "radio").state).toBe(
      "unavailable",
    );
    expect(summarizeDiscoveryPresentation(sources, "acervo").state).toBe(
      "ready",
    );
    expect(summarizeDiscoveryPresentation(sources, "jogos").state).toBe(
      "not_applicable",
    );
    expect(summarizeDiscoveryPresentation(sources, "tudo").groups).toHaveLength(
      1,
    );
  });
});
