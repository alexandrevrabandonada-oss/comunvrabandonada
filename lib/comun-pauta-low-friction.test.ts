import { describe, expect, it } from "vitest";
import {
  assessLowFrictionPautaSafety,
  derivePautaCreationRequestKey,
  derivePautaSlug,
  derivePautaTitle,
  isComunPautaLowFrictionCreationEnabled,
  normalizePautaQuestion,
} from "./comun-pauta-low-friction";

describe("low-friction Pauta creation", () => {
  it("fails closed behind its dedicated flag", () => {
    expect(isComunPautaLowFrictionCreationEnabled({})).toBe(false);
    expect(isComunPautaLowFrictionCreationEnabled({ COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED: "enabled" })).toBe(true);
    expect(isComunPautaLowFrictionCreationEnabled({ COMUN_PAUTA_LOW_FRICTION_CREATION_ENABLED: "true" })).toBe(false);
  });

  it("derives title and slug without inventing content", () => {
    expect(derivePautaTitle("Como melhorar o ônibus à noite no Retiro?")).toBe("Como melhorar o ônibus à noite no Retiro?");
    expect(derivePautaTitle(`${"Uma pergunta coletiva longa ".repeat(6)}Outra frase.`).length).toBeLessThanOrEqual(96);
    expect(derivePautaSlug("Ônibus à noite no Retiro?")).toBe("onibus-a-noite-no-retiro");
  });

  it("normalizes only whitespace and case for strong equivalence", () => {
    expect(normalizePautaQuestion("  Como   melhorar O ônibus? ")).toBe("como melhorar o ônibus?");
  });

  it.each([
    "Meu email é pessoa@example.com e quero discutir isso",
    "Meu CPF é 123.456.789-09 e preciso de ajuda",
    "Ligue para (24) 99999-1234 para combinar",
    "Veja http://localhost/admin?token=segredo",
  ])("rejects clear personal or private data: %s", (question) => {
    expect(assessLowFrictionPautaSafety({ question })).toEqual({ allowed: false, publicReason: "personal_data" });
  });

  it("fails closed for high-risk content and automation", () => {
    expect(assessLowFrictionPautaSafety({ question: "Quero me matar hoje" })).toEqual({ allowed: false, publicReason: "high_risk" });
    expect(assessLowFrictionPautaSafety({ question: "Como melhorar a praça?", honeypot: "bot" })).toEqual({ allowed: false, publicReason: "automation" });
  });

  it("uses authenticated identity, normalized text and a short window for idempotency", () => {
    const base = { userId: "00000000-0000-4000-8000-000000000001", normalizedQuestion: "como melhorar?", secret: "test-secret", now: new Date("2026-08-14T12:10:00Z") };
    expect(derivePautaCreationRequestKey(base)).toBe(derivePautaCreationRequestKey({ ...base, now: new Date("2026-08-14T12:59:00Z") }));
    expect(derivePautaCreationRequestKey(base)).not.toBe(derivePautaCreationRequestKey({ ...base, now: new Date("2026-08-14T13:00:00Z") }));
  });
});
