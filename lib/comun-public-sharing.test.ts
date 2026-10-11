import { describe, expect, it, vi } from "vitest";
import {
  buildComunPageSharePayload,
  projectComunPublicSummary,
} from "./comun-one-product-contract";
import { comunCanonicalRoutes } from "./comun-canonical-routes";

const published = {
  title: "Uma pauta pública",
  summary: "Fontes e próximos passos publicados para consulta voluntária.",
  canonicalPath: "/comun/pautas/pauta-publica",
  publication: "published" as const,
  privacy: "public" as const,
};
describe("public sharing presentation", () => {
  it("uses the same authorized title, summary and canonical for all channels without inventing indexing or dates", () => {
    const { share, metadata } = projectComunPublicSummary(published);
    expect(share).toEqual({
      title: published.title,
      text: published.summary,
      url: "https://comunsocial.online/comun/pautas/pauta-publica",
    });
    expect(metadata.title).toBe(share?.title);
    expect(metadata.description).toBe(share?.text);
    expect(metadata.alternates?.canonical).toBe(share?.url);
    expect(metadata.openGraph).toMatchObject({
      title: share?.title,
      description: share?.text,
      url: share?.url,
    });
    expect(metadata.twitter).toMatchObject({
      title: share?.title,
      description: share?.text,
    });
    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.other).toEqual({ "comun:share": "public" });
    expect(JSON.stringify(metadata)).not.toMatch(
      /datePublished|publishedTime|schema.org/,
    );
  });
  it.each([
    null,
    { ...published, publication: "draft" as const },
    { ...published, publication: "withdrawn" as const },
    { ...published, privacy: "private" as const },
    { ...published, privacy: "pending_review" as const },
    { ...published, summary: "" },
    { ...published, canonicalPath: "/comun/admin/private" },
  ])("fails closed for unavailable or unauthorized content %j", (surface) => {
    const projection = projectComunPublicSummary(surface);
    expect(projection.share).toBeNull();
    expect(projection.metadata.other).toEqual({ "comun:share": "blocked" });
    expect(JSON.stringify(projection.metadata)).not.toContain(
      published.summary,
    );
  });
  it.each([
    "/comun/acompanhar/PROTOCOLO-PRIVADO",
    "/comun/%61dmin/registro",
    "/comun/escola/pratica/identity",
    "/comun/pautas/nova",
    "/comun/relatar/confirmacao",
  ])("does not share private route handles: %s", (path) => {
    expect(
      buildComunPageSharePayload({
        fallbackTitle: "COMUN",
        currentHref: `https://comunsocial.online${path}?token=secret#private`,
        pageTitle: "PRIVATE",
        pageDescription: "PRIVATE",
      }),
    ).toEqual({
      title: "COMUN",
      text: "Veja no COMUN: COMUN",
      url: "https://comunsocial.online/comun",
    });
  });
  it("refuses stale canonical metadata or unproven object routes", () => {
    for (const extra of [
      {
        projectionStatus: "public",
        canonicalHref: "https://comunsocial.online/comun/pautas/old",
      },
      { projectionStatus: "unproven" },
      { projectionStatus: "blocked" },
    ])
      expect(
        buildComunPageSharePayload({
          fallbackTitle: "COMUN",
          currentHref:
            "https://preview.vercel.app/comun/pautas/new?session=secret",
          ...extra,
        }).url,
      ).toBe("https://comunsocial.online/comun");
  });
  it("does not leak a private mobile header through the product-home fallback", () => {
    const payload = buildComunPageSharePayload({
      fallbackTitle: "PRIVATE PERSON / PRIVATE PROTOCOL",
      pageTitle: "PRIVATE OBJECT",
      pageDescription: "PRIVATE NOTES",
      currentHref: "https://comunsocial.online/comun/acompanhar/PRIVATE_ID",
      projectionStatus: "blocked",
    });
    expect(payload.url).toBe("https://comunsocial.online/comun");
    expect(payload.title).toBe("COMUN");
    expect(JSON.stringify(payload)).not.toContain("PRIVATE");
  });
  it("keeps public result identity in a stable path without query or fragment", () => {
    expect(comunCanonicalRoutes.result("resposta-verificada")).toBe(
      "/comun/resultados/resposta-verificada",
    );
    const result = buildComunPageSharePayload({
      fallbackTitle: "COMUN",
      pageTitle: "Resposta pública",
      currentHref:
        "https://preview.vercel.app/comun/resultados/resposta-verificada?email=private#secret",
      canonicalHref:
        "https://comunsocial.online/comun/resultados/resposta-verificada",
      projectionStatus: "public",
    });
    expect(result.url).toBe(
      "https://comunsocial.online/comun/resultados/resposta-verificada",
    );
  });
});

vi.mock("server-only", () => ({}));
const readers = vi.hoisted(() => ({
  pauta: vi.fn(),
  archive: vi.fn(),
  dossier: vi.fn(),
  action: vi.fn(),
  observatory: vi.fn(),
  result: vi.fn(),
}));
vi.mock("./pauta-spaces", () => ({ getPublicPautaSpaceBySlug: readers.pauta }));
vi.mock("./archive", () => ({ getPublicArchiveItem: readers.archive }));
vi.mock("./pauta-dossiers", () => ({
  getPublishedPautaDossierBySlug: readers.dossier,
}));
vi.mock("./collective-actions", () => ({
  getPublicCollectiveAction: readers.action,
}));
vi.mock("./observatories", () => ({
  getPublicObservatory: readers.observatory,
}));
vi.mock("./central-hub", () => ({ getPublicResult: readers.result }));
vi.mock("./collective-actions-release", () => ({
  getCollectiveActionsRelease: async () => ({ enabled: true }),
}));
vi.mock("./collective-actions-release-contract", () => ({
  isCollectiveActionsPreviewFixturesEnabled: () => false,
}));
describe("server adapters over existing authorized readers (not an RLS proof)", () => {
  it("does not serialize provenance, business records or personal fields", async () => {
    const {
      pautaMetadata,
      archiveMetadata,
      dossierMetadata,
      actionMetadata,
      observatoryMetadata,
      resultMetadata,
      materialMetadata,
    } = await import("./comun-public-sharing");
    const privateFields = {
      user_id: "PRIVATE_USER",
      email: "PRIVATE_EMAIL",
      internal_note: "PRIVATE_NOTE",
      object_key: "PRIVATE_KEY",
    };
    const record = {
      ...privateFields,
      slug: "public",
      title: published.title,
      summary: published.summary,
      public_title: published.title,
      public_summary: published.summary,
      public_slug: "public",
      status: "active",
    };
    for (const reader of Object.values(readers))
      reader.mockResolvedValue(record);
    readers.observatory.mockResolvedValue({ o: record });
    for (const load of [
      pautaMetadata,
      archiveMetadata,
      dossierMetadata,
      actionMetadata,
      observatoryMetadata,
      resultMetadata,
    ]) {
      const metadata = await load("public");
      expect(metadata.other).toMatchObject({ "comun:share": "public" });
      expect(JSON.stringify(metadata)).not.toMatch(
        /PRIVATE_|user_id|object_key|internal_note/,
      );
    }
    expect(
      (await materialMetadata("evidencia-ou-suposicao")).other,
    ).toMatchObject({ "comun:share": "public" });
    expect((await materialMetadata("not-selected")).other).toMatchObject({
      "comun:share": "blocked",
    });
    for (const reader of Object.values(readers)) reader.mockResolvedValue(null);
    for (const load of [
      pautaMetadata,
      archiveMetadata,
      dossierMetadata,
      actionMetadata,
      observatoryMetadata,
      resultMetadata,
    ])
      expect((await load("missing")).other).toMatchObject({
        "comun:share": "blocked",
      });
  });
  it("does not advertise withdrawn/draft observatories even if a privileged reader returns them", async () => {
    const { observatoryMetadata, getPublicObservatory } =
      await import("./comun-public-sharing");
    for (const status of ["draft", "archived", "withdrawn"]) {
      readers.observatory.mockResolvedValue({
        o: {
          slug: "private",
          title: "PRIVATE",
          public_summary: published.summary,
          status,
        },
      });
      expect(await getPublicObservatory("private")).toBeNull();
      expect((await observatoryMetadata("private")).other).toMatchObject({
        "comun:share": "blocked",
      });
    }
  });
});
