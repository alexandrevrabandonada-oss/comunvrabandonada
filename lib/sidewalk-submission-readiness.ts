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

type AnonymousSessionClient = {
  auth: {
    getSession(): Promise<{
      data: { session: unknown | null };
      error?: unknown;
    }>;
    signInAnonymously(): Promise<{
      data?: { session?: unknown | null };
      error: unknown | null;
    }>;
  };
};

export async function ensureSidewalkAnonymousSession(
  client: AnonymousSessionClient,
) {
  const current = await client.auth.getSession();
  if (current.error)
    throw new Error("Não foi possível verificar a sessão privada.");
  if (current.data.session) return { source: "existing" as const };

  const created = await client.auth.signInAnonymously();
  if (created.error || !created.data?.session)
    throw new Error(
      "Não foi possível criar a sessão privada neste dispositivo.",
    );
  return { source: "created" as const };
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
