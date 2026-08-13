import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getClientFingerprint } from "@/lib/rate-limit";

export const publicRodaStatuses = [
  "open",
  "synthesizing",
  "decision",
  "action",
  "completed",
] as const;
export const publicRoundStatuses = ["open", "closed", "synthesized"] as const;
export const rodaContributionTypes = [
  "testimony",
  "question",
  "evidence",
  "correction",
  "proposal",
  "counterpoint",
  "task_offer",
  "support_offer",
  "update",
  "memory",
] as const;

export type PublicRodaStatus = (typeof publicRodaStatuses)[number];
export type PublicRoundStatus = (typeof publicRoundStatuses)[number];
export type RodaContributionType = (typeof rodaContributionTypes)[number];
export type RodaParticipationMode =
  | "moderated_public"
  | "registered_members"
  | "invited_group"
  | "internal";

export type PublicRodaContributionV1 = {
  id: string;
  contributionType: RodaContributionType;
  publicBody: string;
  publicAuthorLabel: string;
  createdAt: string;
  incorporated: boolean;
};

export type PublicRodaSynthesisV1 = {
  state: "published";
  publicSummary: string;
  agreements: readonly string[];
  disagreements: readonly string[];
  openQuestions: readonly string[];
  missingEvidence: readonly string[];
  proposedNextSteps: readonly string[];
  publishedAt: string | null;
};

export type PublicRodaRoundV1 = {
  id: string;
  title: string;
  publicPrompt: string;
  publicGuidance: string | null;
  status: PublicRoundStatus;
  position: number;
  opensAt: string | null;
  closesAt: string | null;
  isCurrent: boolean;
  canParticipate: boolean;
  contributions: readonly PublicRodaContributionV1[];
  contributionsTruncated: boolean;
  synthesis:
    | PublicRodaSynthesisV1
    | { state: "none" }
    | { state: "unavailable" };
};

export type PublicRodaV1 = {
  id: string;
  pautaId: string;
  title: string;
  publicQuestion: string;
  publicContext: string | null;
  status: PublicRodaStatus;
  participationMode: RodaParticipationMode;
  startsAt: string | null;
  closesAt: string | null;
  currentRound: PublicRodaRoundV1 | null;
  pastRounds: readonly PublicRodaRoundV1[];
  publishedSynthesisState: "none" | "published" | "unavailable";
};

export type RawRodaCircle = {
  id: string;
  pauta_id: string;
  title: string;
  public_question: string;
  public_context: string | null;
  status: string;
  participation_mode: string;
  current_round_id: string | null;
  starts_at: string | null;
  closes_at: string | null;
};
export type RawRodaRound = {
  id: string;
  circle_id: string;
  title: string;
  public_prompt: string;
  public_guidance: string | null;
  status: string;
  position: number;
  opens_at: string | null;
  closes_at: string | null;
};
export type RawRodaContribution = {
  id: string;
  circle_id: string;
  round_id: string;
  contribution_type: string;
  public_body: string;
  author_display_name: string | null;
  anonymous_publication: boolean;
  status: string;
  created_at: string;
};
export type RawRodaSynthesis = {
  id: string;
  circle_id: string;
  round_id: string;
  public_summary: string;
  agreements: string[];
  disagreements: string[];
  open_questions: string[];
  missing_evidence: string[];
  proposed_next_steps: string[];
  status: string;
  published_at: string | null;
};

const contributionLimit = 40;
const rodaRateWindows = new Map<string, { startedAt: number; count: number }>();

export async function assessRodaContributionSafety(input: {
  body: string;
  honeypot: string;
  challengeAnswer: string;
}) {
  if (input.honeypot.trim() || input.challengeAnswer.trim() !== "5") {
    return { allowed: false, reason: "human_check" as const };
  }
  const fingerprint = await getClientFingerprint();
  const key = fingerprint.ip_hash ?? "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const current = rodaRateWindows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    rodaRateWindows.set(key, { startedAt: now, count: 1 });
    return { allowed: true, reason: "ok" as const };
  }
  current.count += 1;
  if (rodaRateWindows.size > 2_000) {
    for (const [candidate, value] of rodaRateWindows) {
      if (now - value.startedAt >= windowMs) rodaRateWindows.delete(candidate);
    }
  }
  return { allowed: current.count <= 5, reason: current.count <= 5 ? "ok" as const : "rate_limit" as const };
}

function included<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value as T[number]);
}

function publicAuthorLabel(row: RawRodaContribution) {
  if (row.anonymous_publication) return "Participação anônima";
  const safe = (row.author_display_name ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return safe || "Participante";
}

export function projectPublicRodaV1(input: {
  circle: RawRodaCircle;
  rounds: readonly RawRodaRound[];
  contributions: readonly RawRodaContribution[];
  syntheses: readonly RawRodaSynthesis[];
}): PublicRodaV1 | null {
  const { circle } = input;
  if (
    !included(publicRodaStatuses, circle.status) ||
    !(["moderated_public", "registered_members", "invited_group", "internal"] as const).includes(
      circle.participation_mode as RodaParticipationMode,
    )
  ) return null;

  const rounds = input.rounds
    .filter((round) => round.circle_id === circle.id && included(publicRoundStatuses, round.status))
    .sort((a, b) => a.position - b.position)
    .map((round): PublicRodaRoundV1 => {
      const visible = input.contributions
        .filter(
          (item) =>
            item.circle_id === circle.id &&
            item.round_id === round.id &&
            (item.status === "visible" || item.status === "incorporated") &&
            included(rodaContributionTypes, item.contribution_type),
        )
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const published = input.syntheses.filter(
        (item) => item.circle_id === circle.id && item.round_id === round.id && item.status === "published",
      );
      let synthesis: PublicRodaRoundV1["synthesis"] = { state: "none" };
      if (published.length === 1) {
        const item = published[0];
        synthesis = {
          state: "published",
          publicSummary: item.public_summary,
          agreements: item.agreements,
          disagreements: item.disagreements,
          openQuestions: item.open_questions,
          missingEvidence: item.missing_evidence,
          proposedNextSteps: item.proposed_next_steps,
          publishedAt: item.published_at,
        };
      } else if (published.length > 1) {
        console.error("COMUN_RODAS_VIVAS_SYNTHESIS_INTEGRITY_CONFLICT");
        synthesis = { state: "unavailable" };
      }
      const isCurrent = circle.current_round_id === round.id;
      return {
        id: round.id,
        title: round.title,
        publicPrompt: round.public_prompt,
        publicGuidance: round.public_guidance,
        status: round.status as PublicRoundStatus,
        position: round.position,
        opensAt: round.opens_at,
        closesAt: round.closes_at,
        isCurrent,
        canParticipate: isCurrent && round.status === "open",
        contributions: visible.slice(0, contributionLimit).map((item) => ({
          id: item.id,
          contributionType: item.contribution_type as RodaContributionType,
          publicBody: item.public_body,
          publicAuthorLabel: publicAuthorLabel(item),
          createdAt: item.created_at,
          incorporated: item.status === "incorporated",
        })),
        contributionsTruncated: visible.length > contributionLimit,
        synthesis,
      };
    });
  const synthesisStates = rounds.map((round) => round.synthesis.state);
  return {
    id: circle.id,
    pautaId: circle.pauta_id,
    title: circle.title,
    publicQuestion: circle.public_question,
    publicContext: circle.public_context,
    status: circle.status as PublicRodaStatus,
    participationMode: circle.participation_mode as RodaParticipationMode,
    startsAt: circle.starts_at,
    closesAt: circle.closes_at,
    currentRound: rounds.find((round) => round.isCurrent) ?? null,
    pastRounds: rounds.filter((round) => !round.isCurrent),
    publishedSynthesisState: synthesisStates.includes("unavailable")
      ? "unavailable"
      : synthesisStates.includes("published") ? "published" : "none",
  };
}

async function loadPublicRodaRows(pautaId: string, circleId?: string) {
  const service = createServiceSupabaseClient();
  if (!service) return { circles: [], rounds: [], contributions: [], syntheses: [] };
  let circlesQuery = service
    .from("comun_construction_circles" as never)
    .select("id,pauta_id,title,public_question,public_context,status,participation_mode,current_round_id,starts_at,closes_at")
    .eq("pauta_id" as never, pautaId)
    .in("status" as never, [...publicRodaStatuses]);
  if (circleId) circlesQuery = circlesQuery.eq("id" as never, circleId);
  const { data: circleData, error: circleError } = await circlesQuery;
  if (circleError || !circleData) return { circles: [], rounds: [], contributions: [], syntheses: [] };
  const circles = circleData as unknown as RawRodaCircle[];
  const ids = circles.map((circle) => circle.id);
  if (!ids.length) return { circles, rounds: [], contributions: [], syntheses: [] };
  const [roundResult, synthesisResult] = await Promise.all([
    service.from("comun_construction_circle_rounds" as never)
      .select("id,circle_id,title,public_prompt,public_guidance,status,position,opens_at,closes_at")
      .in("circle_id" as never, ids).in("status" as never, [...publicRoundStatuses])
      .order("position" as never, { ascending: true }),
    service.from("comun_circle_syntheses" as never)
      .select("id,circle_id,round_id,public_summary,agreements,disagreements,open_questions,missing_evidence,proposed_next_steps,status,published_at")
      .in("circle_id" as never, ids).eq("status" as never, "published"),
  ]);
  if (roundResult.error || synthesisResult.error) {
    return { circles: [], rounds: [], contributions: [], syntheses: [] };
  }
  const currentRoundIds = circleId
    ? circles.map((circle) => circle.current_round_id).filter((id): id is string => Boolean(id))
    : [];
  const contributionResult = currentRoundIds.length
    ? await service.from("comun_circle_contributions" as never)
      .select("id,circle_id,round_id,contribution_type,public_body,author_display_name,anonymous_publication,status,created_at")
      .in("round_id" as never, currentRoundIds).in("status" as never, ["visible", "incorporated"])
      .order("created_at" as never, { ascending: true }).limit(contributionLimit + 1)
    : { data: [], error: null };
  if (contributionResult.error) return { circles: [], rounds: [], contributions: [], syntheses: [] };
  return {
    circles,
    rounds: (roundResult.data ?? []) as unknown as RawRodaRound[],
    contributions: (contributionResult.data ?? []) as unknown as RawRodaContribution[],
    syntheses: (synthesisResult.data ?? []) as unknown as RawRodaSynthesis[],
  };
}

export async function listPublicRodasForPauta(pautaId: string) {
  const rows = await loadPublicRodaRows(pautaId);
  return rows.circles
    .map((circle) => projectPublicRodaV1({ circle, rounds: rows.rounds, contributions: rows.contributions, syntheses: rows.syntheses }))
    .filter((roda): roda is PublicRodaV1 => roda !== null)
    .sort((a, b) => publicRodaStatuses.indexOf(a.status) - publicRodaStatuses.indexOf(b.status));
}

export async function getPublicRodaForPauta(pautaId: string, circleId: string) {
  const rows = await loadPublicRodaRows(pautaId, circleId);
  const circle = rows.circles[0];
  return circle ? projectPublicRodaV1({ circle, rounds: rows.rounds, contributions: rows.contributions, syntheses: rows.syntheses }) : null;
}
