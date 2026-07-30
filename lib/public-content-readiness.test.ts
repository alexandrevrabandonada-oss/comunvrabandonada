import { describe, expect, it } from "vitest";
import {
  inspectPublicContentReadiness,
  isPublicContentDeliverable,
} from "./public-content-readiness";

describe("public content readiness", () => {
  it("aceita conteúdo publicado com metadados editoriais coerentes", () => {
    expect(
      isPublicContentDeliverable({
        slug: "registro-calçada-centro",
        title: "Calçada no Centro",
        summary: "Derivada pública revisada pela equipe.",
        status: "published",
        visibility: "public",
        published_at: "2026-07-30T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("recusa fixtures e smoke mesmo quando a linha está publicada", () => {
    expect(
      inspectPublicContentReadiness({
        slug: "smoke-acervo-123-published",
        title: "Fotografia smoke",
        summary: "Teste controlado",
        status: "published",
        visibility: "public",
        published_at: "2026-07-30T00:00:00Z",
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        "technical_slug",
        "technical_editorial_metadata",
      ]),
    );
  });

  it("recusa derivada pública com título ou resumo ainda privados", () => {
    expect(
      inspectPublicContentReadiness({
        slug: "foto-registro-000359e7",
        title: "Foto privada de registro de calçada",
        summary: "Imagem aguardando revisão de privacidade.",
        status: "published",
        visibility: "public",
        published_at: "2026-07-30T00:00:00Z",
      }).reasons,
    ).toContain("technical_editorial_metadata");
  });

  it("exige publicação e visibilidade pública quando os campos existem", () => {
    expect(
      inspectPublicContentReadiness({
        slug: "memoria-real",
        status: "draft",
        visibility: "private",
        published_at: null,
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        "status_not_published",
        "visibility_not_public",
        "published_at_missing",
      ]),
    );
  });
});
