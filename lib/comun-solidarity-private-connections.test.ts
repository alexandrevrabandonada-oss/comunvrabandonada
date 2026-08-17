import { describe, expect, it } from "vitest";
import {
  COMUN_SOLIDARITY_CONTACT_CONSENT_COPY,
  COMUN_SOLIDARITY_CONTACT_CONSENT_VERSION,
  isComunSolidarityPrivateConnectionsEnabled,
  normalizeSolidarityConnectionMessage,
  normalizeSolidarityProtectedContact,
  solidarityConnectionStateLabel,
} from "./comun-solidarity-private-connections";

describe("A5 private consented connections", () => {
  const parents = {
    COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled",
    COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED: "enabled",
  };

  it("fails closed and depends only on A1 + A2", () => {
    expect(isComunSolidarityPrivateConnectionsEnabled({ ...parents })).toBe(false);
    expect(isComunSolidarityPrivateConnectionsEnabled({
      ...parents,
      COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED: "enabled",
    })).toBe(true);
    expect(isComunSolidarityPrivateConnectionsEnabled({
      ...parents,
      COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "disabled",
      COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED: "enabled",
    })).toBe(false);
  });

  it("uses a versioned connection-specific consent", () => {
    expect(COMUN_SOLIDARITY_CONTACT_CONSENT_VERSION).toBe(
      "comun.solidarity-contact-consent.v1",
    );
    expect(COMUN_SOLIDARITY_CONTACT_CONSENT_COPY).toBe(
      "Autorizo o COMUN a guardar este contato de forma privada e compartilhá-lo com pessoas com acesso ativo a esta organização somente se a organização aceitar esta conexão.",
    );
  });

  it("does not depend on the A3 or A4 flags", () => {
    expect(isComunSolidarityPrivateConnectionsEnabled({
      ...parents,
      COMUN_SOLIDARITY_PRIVATE_CONNECTIONS_ENABLED: "enabled",
      COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED: "disabled",
      COMUN_SOLIDARITY_ORGANIZATION_ONBOARDING_ENABLED: "disabled",
    })).toBe(true);
  });

  it.each([
    "Meu email é pessoa@example.org",
    "Fale no 24999998888",
    "https://example.org/perfil",
    "@contato",
    "CPF 123.456.789-00",
  ])("blocks contact bypass in the message: %s", (message) => {
    expect(normalizeSolidarityConnectionMessage(message)).toBeNull();
  });

  it("accepts a safe message and protected contact", () => {
    expect(normalizeSolidarityConnectionMessage("Gostaria de entender como posso colaborar."))
      .toBe("Gostaria de entender como posso colaborar.");
    expect(normalizeSolidarityProtectedContact("pessoa@example.org"))
      .toBe("pessoa@example.org");
  });

  it.each(["CPF 123.456.789-00", "senha: abc123", "endereço residencial Rua A casa 10"])(
    "blocks prohibited protected contact content: %s",
    (contact) => expect(normalizeSolidarityProtectedContact(contact)).toBeNull(),
  );

  it("uses the safe member-facing states", () => {
    expect(solidarityConnectionStateLabel("pending")).toBe("Aguardando resposta");
    expect(solidarityConnectionStateLabel("accepted")).toBe("Conexão aceita");
    expect(solidarityConnectionStateLabel("withdrawn")).toBe("Você retirou esta conexão");
  });
});
