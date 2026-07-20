import { describe, expect, it } from "vitest";
import {
  AFFECTED_GROUPS,
  IMPACT_LEVELS,
  SIDEWALK_CATEGORIES,
  SIDEWALK_STATUS,
  classifyReview,
  coverageWarning,
  isFixtureResponse,
  isProtocolStatusTerminal,
  publicLocation,
  sanitizeObservationPayload,
  sanitizeProtocolPackage,
  suggestDuplicate,
  validateAffectedGroups,
  validateImpactLevel,
  validateResultEvidence,
  validateSafeGeoJson,
  validateSidewalkCategory,
  validateSidewalkStatus,
} from "./sidewalk-pilot-rules";

describe("categorias do piloto de calçadas", () => {
  it("aceita categorias válidas", () => {
    for (const category of SIDEWALK_CATEGORIES) {
      expect(validateSidewalkCategory(category)).toBe(true);
    }
  });
  it("rejeita categorias inesperadas", () => {
    expect(validateSidewalkCategory("furto")).toBe(false);
  });
});

describe("níveis de impacto", () => {
  it("aceita níveis conhecidos", () => {
    for (const level of IMPACT_LEVELS) {
      expect(validateImpactLevel(level)).toBe(true);
    }
  });
  it("rejeita níveis fora da escala", () => {
    expect(validateImpactLevel("extreme")).toBe(false);
  });
});

describe("grupos afetados", () => {
  it("aceita grupos válidos", () => {
    expect(validateAffectedGroups(["wheelchair_users", "elderly"])).toBe(true);
  });
  it("rejeita lista vazia", () => {
    expect(validateAffectedGroups([])).toBe(false);
  });
  it("rejeita grupos desconhecidos", () => {
    expect(validateAffectedGroups(["motorists"])).toBe(false);
  });
});

describe("status da contribuição", () => {
  it("aceita status válidos", () => {
    for (const status of SIDEWALK_STATUS) {
      expect(validateSidewalkStatus(status)).toBe(true);
    }
  });
  it("rejeita status inesperado", () => {
    expect(validateSidewalkStatus("deleted")).toBe(false);
  });
});

describe("geometrias", () => {
  it("aceita Point válido", () => {
    expect(validateSafeGeoJson({ type: "Point", coordinates: [-44.1, -22.5] })).toEqual({ ok: true });
  });
  it("aceita LineString válido", () => {
    expect(validateSafeGeoJson({ type: "LineString", coordinates: [[-44.1, -22.5], [-44.2, -22.6]] })).toEqual({ ok: true });
  });
  it("rejeita Polygon", () => {
    const result = validateSafeGeoJson({ type: "Polygon", coordinates: [] });
    expect(result.ok).toBe(false);
  });
  it("rejeita propriedades privadas", () => {
    const result = validateSafeGeoJson({ type: "Point", coordinates: [0, 0], properties: { private: "x" } });
    expect(result.ok).toBe(false);
  });
  it("rejeita coordenadas inválidas", () => {
    const result = validateSafeGeoJson({ type: "Point", coordinates: [999, 0] });
    expect(result.ok).toBe(false);
  });
});

describe("localização pública/privada", () => {
  it("aproxima coordenadas públicas", () => {
    expect(publicLocation({ latitude: -22.123456, longitude: -44.123456, location_precision: "approximate" })).toEqual({
      latitude: -22.123,
      longitude: -44.123,
      precision: "approximate",
    });
  });
  it("oculta coordenada privada", () => {
    expect(publicLocation({ latitude: -22.1, longitude: -44.1, location_precision: "hidden" })).toBeNull();
  });
  it("ignora campo private_location", () => {
    expect(
      publicLocation({ latitude: -22.1, longitude: -44.1, location_precision: "approximate", private_location: "Rua secreta" }),
    ).toEqual({ latitude: -22.1, longitude: -44.1, precision: "approximate" });
  });
});

describe("revisão e verificação", () => {
  it("classifica publicação após verificação", () => {
    expect(classifyReview({ status: "published", verification_status: "verified" })).toBe("published");
  });
  it("classifica rejeição", () => {
    expect(classifyReview({ status: "rejected", verification_status: "unverified" })).toBe("rejected");
  });
  it("mantém pendente quando não verificado", () => {
    expect(classifyReview({ status: "pending", verification_status: "unverified" })).toBe("pending");
  });
});

describe("duplicidade", () => {
  it("sugere duplicidade quando hashes iguais", () => {
    expect(suggestDuplicate("abc", "abc")).toBe(true);
  });
  it("não sugere duplicidade quando hashes diferentes", () => {
    expect(suggestDuplicate("abc", "def")).toBe(false);
  });
  it("não funde automaticamente hashes vazios", () => {
    expect(suggestDuplicate("", "")).toBe(false);
  });
});

describe("cobertura", () => {
  it("avisa quando abaixo do mínimo", () => {
    expect(coverageWarning(2, 3)).toMatch(/Cobertura insuficiente/);
  });
  it("não avisa quando atinge o mínimo", () => {
    expect(coverageWarning(3, 3)).toBeNull();
  });
});

describe("protocolo", () => {
  it("identifica status terminal", () => {
    expect(isProtocolStatusTerminal("resolved")).toBe(true);
    expect(isProtocolStatusTerminal("unresolved")).toBe(true);
    expect(isProtocolStatusTerminal("draft")).toBe(false);
  });
  it("remove campos sensíveis do pacote", () => {
    const safe = sanitizeProtocolPackage({
      public_summary: "Resumo público",
      private_contact: "secret",
      raw_text: "secret",
      internal_notes: "secret",
      object_key: "secret",
    });
    expect(safe).toEqual({ public_summary: "Resumo público" });
  });
});

describe("resposta fixture", () => {
  it("reconhece resposta marcada como fixture", () => {
    expect(isFixtureResponse({ is_fixture: true })).toBe(true);
    expect(isFixtureResponse({ source: "fixture" })).toBe(true);
  });
  it("rejeita resposta sem marcação", () => {
    expect(isFixtureResponse({})).toBe(false);
  });
});

describe("resultado", () => {
  it("exige evidência quando necessário", () => {
    expect(validateResultEvidence({ evidence_required: true, evidence_count: 1 })).toEqual({ ok: true });
    expect(validateResultEvidence({ evidence_required: true, evidence_count: 0 })).toEqual({ ok: false, error: "Resultado exige evidência." });
  });
  it("libera quando evidência não é obrigatória", () => {
    expect(validateResultEvidence({ evidence_required: false })).toEqual({ ok: true });
  });
});

describe("sanitização de observação", () => {
  it("remove contato e notas privadas", () => {
    const safe = sanitizeObservationPayload({
      accessibility: "indisponível",
      private_contact: "secret",
      internal_notes: "secret",
      raw_details_private: "secret",
      attachment_private_reference: "secret",
    });
    expect(safe).toEqual({ accessibility: "indisponível" });
  });
});
