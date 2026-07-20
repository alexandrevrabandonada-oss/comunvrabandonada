import { describe, expect, it } from "vitest";
import { communityLoginError, communitySignupError } from "./community-auth-errors";

describe("mensagens recuperáveis de autenticação comunitária", () => {
  it("distingue senha inválida", () => expect(communityLoginError({ code: "invalid_credentials" })).toBe("Não foi possível entrar com essa senha."));
  it("distingue sessão encerrada", () => expect(communityLoginError({ code: "session_not_found" })).toContain("continuar de onde parou"));
  it("distingue conta existente", () => expect(communitySignupError({ code: "user_already_exists" })).toBe("Já existe uma conta com este e-mail."));
  it("mantém falha desconhecida recuperável", () => expect(communityLoginError({ code: "unexpected_failure" })).toContain("Tente novamente"));
});
