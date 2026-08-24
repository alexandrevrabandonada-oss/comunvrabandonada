import { describe, expect, it } from "vitest";
import { resolveCommunitySignupDestination } from "./community-signup-continuity";

describe("continuidade do cadastro comunitário", () => {
  it("mantém o formulário para quem ainda não autenticou", () => {
    expect(
      resolveCommunitySignupDestination({
        authenticated: false,
        onboardingCompleted: false,
        returnTo: "/comun/inicio",
      }),
    ).toBeNull();
  });

  it("não tenta cadastrar novamente uma sessão Google incompleta", () => {
    expect(
      resolveCommunitySignupDestination({
        authenticated: true,
        onboardingCompleted: false,
        returnTo: "/comun/acervo",
      }),
    ).toContain("/comun/onboarding");
  });

  it("retoma o destino para uma conta já concluída", () => {
    expect(
      resolveCommunitySignupDestination({
        authenticated: true,
        onboardingCompleted: true,
        returnTo: "/comun/acervo",
      }),
    ).toBe("/comun/acervo");
  });
});
