export type SidewalkSubmissionPhase =
  | "idle"
  | "validating"
  | "checking_captcha"
  | "creating_private_session"
  | "authorizing_upload"
  | "uploading_photo"
  | "confirming_record"
  | "success"
  | "recoverable_error";

export const SIDEWALK_SUBMISSION_PROGRESS: Record<
  SidewalkSubmissionPhase,
  string
> = {
  idle: "Pronto para enviar.",
  validating: "Validando os dados antes do envio…",
  checking_captcha: "Verificando que este envio é humano…",
  creating_private_session:
    "Criando uma sessão privada para acompanhar sua contribuição…",
  authorizing_upload: "Preparando o envio seguro…",
  uploading_photo: "Enviando a fotografia com segurança…",
  confirming_record: "Registrando sua contribuição para revisão…",
  success: "Contribuição registrada para revisão.",
  recoverable_error:
    "O envio foi interrompido. Seus dados continuam preenchidos.",
};

export function isSidewalkSubmissionPending(phase: SidewalkSubmissionPhase) {
  return !["idle", "success", "recoverable_error"].includes(phase);
}

export function sidewalkSubmissionButtonLabel(phase: SidewalkSubmissionPhase) {
  if (phase === "idle" || phase === "recoverable_error")
    return "Enviar para revisão";
  if (phase === "success") return "Enviado para revisão";
  return SIDEWALK_SUBMISSION_PROGRESS[phase];
}
