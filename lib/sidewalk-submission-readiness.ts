import {
  getSidewalkCaptchaToken,
  resetSidewalkCaptcha,
} from "./sidewalk-hcaptcha";

export type SidewalkSubmissionReadinessInput = {
  hasPhoto: boolean;
  hasPoint: boolean;
  pointConfirmed: boolean;
  hasCondition: boolean;
  consentPublish: boolean;
  reviewConfirmed: boolean;
};

export type SidewalkSubmissionRequirement =
  | "photo"
  | "point"
  | "point_confirmation"
  | "condition"
  | "publication_consent"
  | "review_confirmation";

export function getSidewalkSubmissionReadiness(
  input: SidewalkSubmissionReadinessInput,
) {
  const missing: SidewalkSubmissionRequirement[] = [];
  if (!input.hasPhoto) missing.push("photo");
  if (!input.hasPoint) missing.push("point");
  else if (!input.pointConfirmed) missing.push("point_confirmation");
  if (!input.hasCondition) missing.push("condition");
  if (!input.consentPublish) missing.push("publication_consent");
  if (!input.reviewConfirmed) missing.push("review_confirmation");
  return { ready: missing.length === 0, missing };
}

export function captureSidewalkSubmissionPayload(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    pauta_slug: String(data.get("pauta_slug") ?? ""),
    return_to: String(data.get("return_to") ?? ""),
    description: String(data.get("description") ?? ""),
    category: String(data.get("category") ?? ""),
    problems: String(data.get("problems") ?? ""),
    condition: String(data.get("condition") ?? ""),
    longitude: String(data.get("longitude") ?? ""),
    latitude: String(data.get("latitude") ?? ""),
    location_accuracy_m: String(data.get("location_accuracy_m") ?? ""),
    location_source: String(data.get("location_source") ?? ""),
    affected_groups: String(data.get("affected_groups") ?? ""),
    consent_publish: String(data.get("consent_publish") ?? ""),
  };
}

type AnonymousSessionClient = {
  auth: {
    getSession(): Promise<{
      data: { session: unknown | null };
      error?: unknown;
    }>;
    signInAnonymously(input: { options: { captchaToken: string } }): Promise<{
      data?: { session?: unknown | null };
      error: unknown | null;
    }>;
  };
};

export type SidewalkSessionPhase =
  "checking_captcha" | "creating_private_session";

export type SidewalkAnonymousSessionFailure =
  | "anonymous_auth_unavailable"
  | "captcha_not_accepted"
  | "rate_limited"
  | "network"
  | "unknown";

const ANONYMOUS_SESSION_MESSAGES: Record<
  SidewalkAnonymousSessionFailure,
  string
> = {
  anonymous_auth_unavailable:
    "O envio está temporariamente indisponível porque a sessão anônima ainda não foi liberada. Seus dados continuam neste aparelho.",
  captcha_not_accepted:
    "A verificação antirobô não foi aceita. Conclua-a novamente antes de enviar.",
  rate_limited:
    "Há muitas tentativas neste dispositivo. Aguarde alguns minutos antes de tentar de novo.",
  network:
    "Não foi possível conectar para criar sua sessão privada. Verifique sua conexão e tente novamente.",
  unknown:
    "Não foi possível criar a sessão privada neste dispositivo. Seus dados continuam preenchidos.",
};

type AnonymousSessionErrorLike = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
};

function readErrorText(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function classifySidewalkAnonymousSessionFailure(
  error: unknown,
): SidewalkAnonymousSessionFailure {
  if (!error || typeof error !== "object")
    return error instanceof TypeError ? "network" : "unknown";

  const candidate = error as AnonymousSessionErrorLike;
  const code = readErrorText(candidate.code);
  const message = readErrorText(candidate.message);
  const name = readErrorText(candidate.name);
  const status = typeof candidate.status === "number" ? candidate.status : 0;

  if (code === "anonymous_provider_disabled")
    return "anonymous_auth_unavailable";
  if (
    code.includes("captcha") ||
    message.includes("captcha") ||
    message.includes("hcaptcha")
  )
    return "captcha_not_accepted";
  if (status === 429 || code.includes("rate_limit")) return "rate_limited";
  if (name === "typeerror" || code === "network_error") return "network";
  return "unknown";
}

export class SidewalkAnonymousSessionError extends Error {
  readonly failure: SidewalkAnonymousSessionFailure;

  constructor(failure: SidewalkAnonymousSessionFailure) {
    super(ANONYMOUS_SESSION_MESSAGES[failure]);
    this.name = "SidewalkAnonymousSessionError";
    this.failure = failure;
  }
}

export async function ensureSidewalkAnonymousSession(
  client: AnonymousSessionClient,
  getCaptchaToken: () => Promise<string> = getSidewalkCaptchaToken,
  onPhase?: (phase: SidewalkSessionPhase) => void,
) {
  let current: Awaited<
    ReturnType<AnonymousSessionClient["auth"]["getSession"]>
  >;
  try {
    current = await client.auth.getSession();
  } catch (error) {
    throw new SidewalkAnonymousSessionError(
      classifySidewalkAnonymousSessionFailure(error),
    );
  }
  if (current.error)
    throw new SidewalkAnonymousSessionError(
      classifySidewalkAnonymousSessionFailure(current.error),
    );
  if (current.data.session) return { source: "existing" as const };

  onPhase?.("checking_captcha");
  const captchaToken = (await getCaptchaToken()).trim();
  if (!captchaToken)
    throw new Error("A confirmação antirobô não retornou um token válido.");
  try {
    onPhase?.("creating_private_session");
    const created = await client.auth.signInAnonymously({
      options: { captchaToken },
    });
    if (created.error)
      throw new SidewalkAnonymousSessionError(
        classifySidewalkAnonymousSessionFailure(created.error),
      );
    if (!created.data?.session)
      throw new SidewalkAnonymousSessionError("unknown");
    return { source: "created" as const };
  } catch (error) {
    if (error instanceof SidewalkAnonymousSessionError) throw error;
    throw new SidewalkAnonymousSessionError(
      classifySidewalkAnonymousSessionFailure(error),
    );
  } finally {
    resetSidewalkCaptcha();
  }
}

export function createSingleSubmissionGuard() {
  let active = false;
  return {
    enter() {
      if (active) return false;
      active = true;
      return true;
    },
    release() {
      active = false;
    },
  };
}
