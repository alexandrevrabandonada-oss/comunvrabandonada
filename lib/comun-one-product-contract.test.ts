import { describe, expect, it, vi } from "vitest";
import {
  buildComunPageSharePayload,
  projectComunPublicSurface,
  shareOrCopy,
  validateComunPublicSurface,
  type ComunPublicSurfaceV1,
} from "./comun-one-product-contract";
import { COMUN_CANONICAL_ORIGIN } from "./comun-indexing-policy";

const publicArticle = (
  overrides: Partial<ComunPublicSurfaceV1> = {},
): ComunPublicSurfaceV1 => ({
  schemaVersion: 1,
  id: "ar-poluicao-vr",
  type: "reference_page",
  title: "Qualidade do ar em Volta Redonda",
  summary:
    "Dados, fontes e ações públicas sobre a qualidade do ar em Volta Redonda.",
  canonicalPath: "/comun/observatorios/ar-volta-redonda",
  image: "/icons/comun-512.png",
  territory: { label: "Volta Redonda", canonicalPath: "/comun/territorios/volta-redonda" },
  sources: [{ label: "INEA", url: "https://www.inea.rj.gov.br/" }],
  publishedAt: "2026-10-06",
  updatedAt: "2026-10-06T21:00:00-03:00",
  publication: "published",
  privacy: "public",
  indexingAuthorization: "approved",
  schemaType: "Article",
  ...overrides,
});

describe("COMUN one-product public surface contract", () => {
  it("emits one canonical payload for page metadata, social previews and structured data", () => {
    const projection = projectComunPublicSurface(publicArticle());

    expect(projection.share).toEqual({
      title: "Qualidade do ar em Volta Redonda",
      text:
        "Dados, fontes e ações públicas sobre a qualidade do ar em Volta Redonda.",
      url: `${COMUN_CANONICAL_ORIGIN}/comun/observatorios/ar-volta-redonda`,
    });
    expect(projection.metadata).toMatchObject({
      title: "Qualidade do ar em Volta Redonda",
      alternates: {
        canonical: `${COMUN_CANONICAL_ORIGIN}/comun/observatorios/ar-volta-redonda`,
      },
      robots: { index: false, follow: true },
      openGraph: { type: "article" },
      twitter: { card: "summary_large_image" },
    });
    expect(projection.jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Qualidade do ar em Volta Redonda",
      citation: ["https://www.inea.rj.gov.br/"],
    });
    expect(projection.indexable).toBe(false);
  });

  it("requires explicit launch authorization, indexing authorization and evidence", () => {
    const authorized = projectComunPublicSurface(publicArticle(), {
      launchPublicly: true,
      indexingPolicy: "indexing_open",
    });
    expect(authorized.indexable).toBe(true);
    expect(authorized.metadata.robots).toEqual({ index: true, follow: true });

    const noLaunch = projectComunPublicSurface(publicArticle(), {
      launchPublicly: false,
      indexingPolicy: "indexing_open",
    });
    expect(noLaunch.indexable).toBe(false);

    const noEvidence = projectComunPublicSurface(
      publicArticle({ sources: [] }),
      { launchPublicly: true, indexingPolicy: "indexing_open" },
    );
    expect(noEvidence.indexable).toBe(false);
    expect(noEvidence.findings).toContain("indexing_requires_sources");
  });

  it("keeps private, sensitive, pending and draft surfaces out of share and search projections", () => {
    for (const surface of [
      publicArticle({ privacy: "private" }),
      publicArticle({ privacy: "sensitive" }),
      publicArticle({ privacy: "pending_review" }),
      publicArticle({ publication: "draft" }),
      publicArticle({ publication: "withdrawn" }),
    ]) {
      const projection = projectComunPublicSurface(surface, {
        launchPublicly: true,
        indexingPolicy: "indexing_open",
      });
      expect(projection.shareable).toBe(false);
      expect(projection.indexable).toBe(false);
      expect(projection.share).toBeNull();
      expect(projection.jsonLd).toBeNull();
      expect(projection.metadata).toEqual({
        robots: { index: false, follow: false },
      });
    }
  });

  it("rejects unstable, private and unsupported canonical paths", () => {
    for (const path of [
      "/comun/minha-participacao",
      "/comun/admin/operacao",
      "/comun/observatorios?bairro=retino",
      "//example.org/comun/pauta",
      "/comun/../comun/minha-participacao",
    ]) {
      const findings = validateComunPublicSurface(
        publicArticle({ canonicalPath: path }),
      );
      expect(findings).toContain("canonical_path_not_public_or_stable");
    }
  });

  it("does not emit misleading Event structured data without a start date", () => {
    const projection = projectComunPublicSurface(
      publicArticle({ schemaType: "Event" }),
    );
    expect(projection.findings).toContain("event_start_at_required");
    expect(projection.indexable).toBe(false);
    expect(projection.jsonLd).toBeNull();
  });
});

describe("COMUN page share action", () => {
  it("uses public canonical paths and removes query strings and fragments", () => {
    expect(
      buildComunPageSharePayload({
        fallbackTitle: "COMUN",
        pageTitle: "Pauta de calçadas",
        pageDescription: "Acompanhe as próximas ações públicas desta pauta.",
        canonicalHref: "/comun/pautas/calcadas-em-circulacao?token=secret#evidencias",
        currentHref:
          "https://preview.example/comun/pautas/calcadas-em-circulacao?token=secret#evidencias",
      }),
    ).toEqual({
      title: "Pauta de calçadas",
      text: "Acompanhe as próximas ações públicas desta pauta.",
      url: `${COMUN_CANONICAL_ORIGIN}/comun/pautas/calcadas-em-circulacao`,
    });
  });

  it("falls back to the product home instead of sharing a private route", () => {
    expect(
      buildComunPageSharePayload({
        fallbackTitle: "COMUN VR Abandonada",
        pageTitle: "Pauta privada de uma pessoa",
        pageDescription: "Conteúdo individual",
        currentHref:
          "https://comunsocial.online/comun/minha-participacao?email=pessoa@example.org#item",
      }),
    ).toEqual({
      title: "COMUN VR Abandonada",
      text: "Veja no COMUN: COMUN VR Abandonada",
      url: `${COMUN_CANONICAL_ORIGIN}/comun`,
    });
  });

  it("does not let a private current route borrow a public canonical tag", () => {
    expect(
      buildComunPageSharePayload({
        fallbackTitle: "COMUN VR Abandonada",
        pageTitle: "Conteúdo pessoal",
        pageDescription: "Resumo privado",
        canonicalHref: "/comun/pautas/calcadas-em-circulacao",
        currentHref: "https://comunsocial.online/comun/minha-participacao",
      }),
    ).toEqual({
      title: "COMUN VR Abandonada",
      text: "Veja no COMUN: COMUN VR Abandonada",
      url: `${COMUN_CANONICAL_ORIGIN}/comun`,
    });
  });

  it("uses local origin for development without retaining query data", () => {
    expect(
      buildComunPageSharePayload({
        fallbackTitle: "COMUN",
        currentHref: "http://localhost:3000/comun/pautas?utm_source=private#top",
      }).url,
    ).toBe("http://localhost:3000/comun/pautas");
  });

  it("falls back to copy on unsupported or failed native sharing, but treats cancel as neutral", async () => {
    const payload = {
      title: "COMUN",
      text: "Veja no COMUN",
      url: `${COMUN_CANONICAL_ORIGIN}/comun`,
    };
    const copy = vi.fn().mockResolvedValue(undefined);
    const nativeFailure = vi.fn().mockRejectedValue(new Error("native unavailable"));

    await expect(shareOrCopy(payload, { copy })).resolves.toBe("copied");
    await expect(
      shareOrCopy(payload, { nativeShare: nativeFailure, copy }),
    ).resolves.toBe("copied");
    expect(copy).toHaveBeenCalledTimes(2);

    const cancelled = new DOMException("Cancelled", "AbortError");
    await expect(
      shareOrCopy(payload, {
        nativeShare: vi.fn().mockRejectedValue(cancelled),
        copy,
      }),
    ).resolves.toBe("cancelled");
    expect(copy).toHaveBeenCalledTimes(2);

    await expect(
      shareOrCopy(payload, {
        nativeShare: vi.fn().mockResolvedValue(undefined),
        copy,
      }),
    ).resolves.toBe("shared");

    await expect(
      shareOrCopy(payload, {
        copy: vi.fn().mockRejectedValue(new Error("clipboard unavailable")),
      }),
    ).resolves.toBe("failed");
  });
});
