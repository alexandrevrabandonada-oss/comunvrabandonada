type AuthFailure = { code?: string; message?: string } | null | undefined;

export function communityLoginError(error: AuthFailure) {
  if (error?.code === "invalid_credentials") return "Não foi possível entrar com essa senha.";
  if (error?.code === "email_not_confirmed") return "Confirme seu e-mail antes de entrar.";
  if (error?.code === "session_not_found") return "Sua sessão terminou. Entre novamente para continuar de onde parou.";
  return "Não foi possível entrar agora. Tente novamente.";
}

export function communitySignupError(error: AuthFailure) {
  if (["email_exists", "user_already_exists"].includes(error?.code ?? "")) return "Já existe uma conta com este e-mail.";
  if (error?.code === "weak_password") return "Escolha uma senha mais forte para continuar.";
  return "Não foi possível concluir o cadastro agora. Tente novamente.";
}
