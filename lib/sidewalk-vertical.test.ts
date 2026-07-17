import { describe, expect, it } from "vitest";
import {
  classifyReview,
  coverageWarning,
  isProtocolStatusTerminal,
  publicLocation,
  sanitizeObservationPayload,
  sanitizeProtocolPackage,
  validateResultEvidence,
  validateSafeGeoJson,
  validateSidewalkStatus,
} from "./sidewalk-pilot-rules";
import { computeSidewalkCoverage, sanitizeRecordForPublic } from "./sidewalk-records";
import { computeSidewalkMetrics } from "./sidewalk-snapshots";
import { createFixtureSidewalkImage, getPhotoReviewChecklist, validateSidewalkPhotoImage } from "./sidewalk-photos";

describe("vertical completa de calçadas", () => {
  it("mantém o checklist de privacidade da fotografia", () => {
    expect(getPhotoReviewChecklist()).toEqual(expect.arrayContaining(["face", "child", "license_plate", "house_number", "sensitive_location", "authorship"]));
  });

  it("gera e valida imagem sintética sem dados reais", async () => {
    const image = await createFixtureSidewalkImage();
    const validated = await validateSidewalkPhotoImage(image.buffer, "calcada-fixture.jpg");
    expect(validated).toMatchObject({ mime: "image/jpeg", width: 800, height: 600 });
    expect(validated.checksum).toHaveLength(64);
  });

  it("rejeita extensão incompatível", async () => {
    await expect(validateSidewalkPhotoImage(new Uint8Array(20), "foto.exe")).rejects.toThrow("SIDEWALK_PHOTO_TYPE_INVALID");
  });

  it("aceita ponto e linha territorial seguros", () => {
    expect(validateSafeGeoJson({ type: "Point", coordinates: [-44.1, -22.5] })).toEqual({ ok: true });
    expect(validateSafeGeoJson({ type: "LineString", coordinates: [[-44.1, -22.5], [-44.2, -22.6]] })).toEqual({ ok: true });
  });

  it("rejeita propriedades privadas na geometria", () => {
    expect(validateSafeGeoJson({ type: "Point", coordinates: [-44.1, -22.5], properties: { house_number: "10" } })).toMatchObject({ ok: false });
  });

  it("reduz precisão pública e oculta localização protegida", () => {
    expect(publicLocation({ latitude: -22.52349, longitude: -44.10492, location_precision: "approximate" })).toEqual({ latitude: -22.523, longitude: -44.105, precision: "approximate" });
    expect(publicLocation({ latitude: -22.5, longitude: -44.1, location_precision: "hidden" })).toBeNull();
  });

  it("classifica revisão e estados finais", () => {
    expect(classifyReview({ status: "published", verification_status: "verified" })).toBe("published");
    expect(validateSidewalkStatus("resolved")).toBe(true);
    expect(validateSidewalkStatus("withdrawn")).toBe(true);
  });

  it("calcula cobertura sem ranking de pessoas", () => {
    const records = [
      { verification_status: "verified", impact_level: "critical", territory_id: "t1", status: "published" },
      { verification_status: "unverified", impact_level: "low", territory_id: "t1", status: "resolved" },
    ];
    expect(computeSidewalkCoverage(records)).toEqual({ total: 2, verified: 1, highImpact: 1, resolved: 1, territories: 1 });
    expect(coverageWarning(2, 3)).toContain("Cobertura insuficiente");
  });

  it("calcula snapshots por definição e amostra", () => {
    const ids = { "total-publicado": "a", "total-verificado": "b", "impacto-alto": "c", "barreiras-acessibilidade": "d", "territorios-cobertos": "e", resolvidos: "f" };
    const metrics = computeSidewalkMetrics([{ verification_status: "verified", impact_level: "high", categories: ["ausencia_rampa"], territory_id: "t", status: "resolved" }], ids);
    expect(metrics).toEqual({ a: { numeric: 1, sample: 1 }, b: { numeric: 1, sample: 1 }, c: { numeric: 1, sample: 1 }, d: { numeric: 1, sample: 1 }, e: { numeric: 1, sample: 1 }, f: { numeric: 1, sample: 1 } });
  });

  it("remove campos privados do registro público", () => {
    expect(sanitizeRecordForPublic({ id: "r", private_notes: "segredo", source_contribution_id: "c", public_summary: "ok" })).toEqual({ id: "r", public_summary: "ok" });
  });

  it("sanitiza protocolo recursivamente", () => {
    const safe = sanitizeProtocolPackage({ title: "ok", nested: { private_contact: "x", signed_url: "x", value: 2 }, rows: [{ raw_text: "x", public: "sim" }] });
    expect(safe).toEqual({ title: "ok", nested: { value: 2 }, rows: [{ public: "sim" }] });
  });

  it("sanitiza observação recursivamente", () => {
    expect(sanitizeObservationPayload({ count: 1, nested: { internal_notes: "x", public: true }, rows: [{ raw_details_private: "x", value: 3 }] })).toEqual({ count: 1, nested: { public: true }, rows: [{ value: 3 }] });
  });

  it("exige evidência no resultado quando configurado", () => {
    expect(validateResultEvidence({ evidence_required: true, evidence_count: 0 })).toMatchObject({ ok: false });
    expect(validateResultEvidence({ evidence_required: true, evidence_fixture_ids: ["fixture"] })).toEqual({ ok: true });
  });

  it("reconhece estados terminais do protocolo", () => {
    expect(isProtocolStatusTerminal("resolved")).toBe(true);
    expect(isProtocolStatusTerminal("waiting_response")).toBe(false);
  });
});
