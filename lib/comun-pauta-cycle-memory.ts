import type { PublicCollectiveActionDetailV1 } from "./comun-collective-actions-canonical";
import { isPublicEvidenceCitationV1 } from "./comun-public-evidence";
import type { PublicRodaV1, PublicRodaSynthesisV1 } from "./comun-rodas-vivas";
import type { PublicPautaActionCycleV1 } from "./pauta-action-cycle-data";
import type {
  PublicPautaEvidenceItem,
  PublicPautaSpace,
} from "./pauta-spaces";

export const PAUTA_CYCLE_MEMORY_CONTRACT =
  "comun.public-pauta-cycle-memory.v1" as const;

export type PublicPautaCycleMemoryResultState =
  | "confirmed"
  | "in_verification"
  | "contested"
  | "recorded";

export type PublicPautaCycleMemoryV1 = {
  contractVersion: typeof PAUTA_CYCLE_MEMORY_CONTRACT;
  pauta: {
    slug: string;
    title: string;
    status: string;
  };
  currentState: "active" | "concluded";
  chapters: {
    issue: {
      problem: string | null;
      summary: string | null;
      demand: string | null;
    };
    evidence: readonly {
      sourceId: string;
      title: string;
      summary: string | null;
      createdAt: string;
      citation: {
        refId: string;
        versionId: string;
        publicPath: string;
        sourceKind: string;
        referencePeriod: string;
      } | null;
    }[];
    conversation: readonly {
      rodaId: string;
      title: string;
      question: string;
      rounds: readonly {
        roundId: string;
        title: string;
        prompt: string;
        synthesis: PublicRodaSynthesisV1;
      }[];
    }[];
    decisions: readonly {
      sourceId: "action-cycle";
      title: string;
      summary: string;
      justification: string | null;
      decidedAt: string | null;
    }[];
    actions: readonly {
      actionId: string;
      slug: string;
      title: string;
      summary: string;
      objective: string;
      status: string;
      startsAt: string | null;
      endsAt: string | null;
      relation: "explicit_cycle_link" | "same_pauta_context";
      updates: readonly {
        updateId: string;
        type: string;
        title: string;
        summary: string;
        occurredAt: string;
      }[];
      forwarding: {
        recipientName: string | null;
        summary: string | null;
        state: string;
        sentAt: string | null;
      } | null;
      institutionalProtocol: {
        kind: "official" | "comun_tracking";
        code: string;
        status: string;
        summary: string;
        responseReceivedAt: string | null;
      } | null;
    }[];
    results: readonly {
      sourceId: string;
      title: string;
      summary: string;
      state: PublicPautaCycleMemoryResultState;
      occurredAt: string | null;
      evidenceSummary: string | null;
    }[];
    learnings: readonly {
      actionId: string;
      actionTitle: string;
      publishedAt: string;
      memorySummary: string | null;
      learnedSummary: string | null;
      nextStepsSummary: string | null;
      assets: readonly {
        assetId: string;
        kind: "document" | "photograph";
        title: string;
        publicUrl: string;
      }[];
    }[];
    editorialSyntheses: readonly {
      dossierId: string;
      title: string;
      summary: string;
      publicPath: string;
      versionLabel: string;
    }[];
  };
  currentNextStep: string | null;
  limitations: readonly string[];
};

export type PublicCycleMemoryDossierInput = {
  id: string;
  public_slug: string;
  public_title: string;
  public_summary: string;
  public_version_label: string | null;
};

function publicRounds(roda: PublicRodaV1) {
  return [...roda.pastRounds, ...(roda.currentRound ? [roda.currentRound] : [])]
    .filter(
      (round): round is typeof round & { synthesis: PublicRodaSynthesisV1 } =>
        round.synthesis.state === "published",
    )
    .sort((a, b) => a.position - b.position)
    .map((round) => ({
      roundId: round.id,
      title: round.title,
      prompt: round.publicPrompt,
      synthesis: round.synthesis,
    }));
}

function resultState(value: string): PublicPautaCycleMemoryResultState | null {
  if (value === "verified") return "confirmed";
  if (value === "pending") return "in_verification";
  if (value === "disputed") return "contested";
  if (value === "superseded") return null;
  return "recorded";
}

export function derivePublicPautaCycleMemoryV1(input: {
  pauta: PublicPautaSpace;
  evidence: readonly PublicPautaEvidenceItem[];
  rodas: readonly PublicRodaV1[];
  actions: readonly PublicCollectiveActionDetailV1[];
  actionCycle: PublicPautaActionCycleV1 | null;
  dossiers: readonly PublicCycleMemoryDossierInput[];
}): PublicPautaCycleMemoryV1 {
  const linkedActionSlug = input.actionCycle?.action?.slug ?? null;
  const limitations = new Set<string>();
  const publicSynthesisEvidence = input.pauta.public_synthesis
    ? [
        {
          sourceId: "pauta-public-synthesis",
          title: "Síntese pública atual da pauta",
          summary: input.pauta.public_synthesis,
          createdAt: input.pauta.updated_at,
          citation: null,
        },
      ]
    : [];
  const evidenceItems = input.evidence.slice(0, 8).map((item) => {
    const citation = isPublicEvidenceCitationV1(item.public_evidence_payload)
      ? item.public_evidence_payload
      : null;
    if (citation?.claimKind === "data_gap") {
      limitations.add(citation.title);
      citation.limitations.forEach((limitation) => limitations.add(limitation));
    }
    return {
      sourceId: item.id,
      title: item.title,
      summary: item.summary,
      createdAt: item.created_at,
      citation: citation
        ? {
            refId: citation.refId,
            versionId: citation.versionId,
            publicPath: citation.publicPath,
            sourceKind: citation.sourceKind,
            referencePeriod: citation.referencePeriod,
          }
        : null,
    };
  });
  const evidence = [...publicSynthesisEvidence, ...evidenceItems].slice(0, 8);

  const actions = input.actions.slice(0, 8).map((action) => ({
    actionId: action.id,
    slug: action.slug,
    title: action.title,
    summary: action.summary,
    objective: action.objective,
    status: action.status,
    startsAt: action.startsAt,
    endsAt: action.endsAt,
    relation:
      linkedActionSlug === action.slug
        ? ("explicit_cycle_link" as const)
        : ("same_pauta_context" as const),
    updates: [...action.publicUpdates]
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .slice(-6)
      .map((update) => ({
        updateId: update.id,
        type: update.updateType,
        title: update.title,
        summary: update.publicSummary,
        occurredAt: update.occurredAt,
      })),
    forwarding: action.publicForwarding
      ? {
          recipientName: action.publicForwarding.recipientName,
          summary: action.publicForwarding.publicSummary,
          state: action.publicForwarding.state,
          sentAt: action.publicForwarding.sentAt,
      }
      : null,
    institutionalProtocol:
      linkedActionSlug === action.slug &&
      input.actionCycle?.protocol?.public_summary
        ? {
            kind: input.actionCycle.protocol.official_protocol_number
              ? ("official" as const)
              : ("comun_tracking" as const),
            code:
              input.actionCycle.protocol.official_protocol_number ??
              input.actionCycle.protocol.comun_protocol,
            status: input.actionCycle.protocol.status,
            summary: input.actionCycle.protocol.public_summary,
            responseReceivedAt:
              input.actionCycle.protocol.response_received_at,
          }
        : null,
  }));

  const results: Array<
    PublicPautaCycleMemoryV1["chapters"]["results"][number]
  > = [];
  if (input.actionCycle?.result) {
    const state = resultState(input.actionCycle.result.verification_status);
    if (state) {
      results.push({
        sourceId: "action-cycle-result",
        title: input.actionCycle.result.title,
        summary: input.actionCycle.result.public_summary,
        state,
        occurredAt: input.actionCycle.result.occurred_at,
        evidenceSummary: input.actionCycle.result.evidence_summary_public,
      });
    }
  }
  for (const action of input.actions.slice(0, 8)) {
    if (
      action.status === "completed" &&
      action.publicMemory.publishedAt &&
      action.publicMemory.resultSummary
    ) {
      results.push({
        sourceId: `collective-action:${action.id}`,
        title: action.title,
        summary: action.publicMemory.resultSummary,
        state:
          action.publicMemory.resultStatus === "partial" ||
          action.publicMemory.resultStatus === "not_achieved"
            ? "recorded"
            : "confirmed",
        occurredAt: action.endsAt,
        evidenceSummary: null,
      });
    }
  }

  const nextStep =
    input.actionCycle?.nextAction ??
    input.actions.find((action) => action.publicMemory.publishedAt)
      ?.publicMemory.nextStepsSummary ??
    input.pauta.next_step;

  return {
    contractVersion: PAUTA_CYCLE_MEMORY_CONTRACT,
    pauta: {
      slug: input.pauta.slug,
      title: input.pauta.title,
      status: input.pauta.status,
    },
    currentState:
      input.pauta.status === "resolved" || input.pauta.status === "archived"
        ? "concluded"
        : "active",
    chapters: {
      issue: {
        problem: input.pauta.problem_public,
        summary: input.pauta.summary,
        demand: input.pauta.demand_public,
      },
      evidence,
      conversation: input.rodas.slice(0, 8).map((roda) => ({
        rodaId: roda.id,
        title: roda.title,
        question: roda.publicQuestion,
        rounds: publicRounds(roda),
      })),
      decisions: input.actionCycle?.decision
        ? [
            {
              sourceId: "action-cycle",
              title: input.actionCycle.decision.public_title,
              summary: input.actionCycle.decision.public_summary,
              justification:
                input.actionCycle.decision.public_justification ?? null,
              decidedAt: input.actionCycle.decision.decided_at,
            },
          ]
        : [],
      actions,
      results,
      learnings: input.actions
        .filter((action) => action.publicMemory.publishedAt)
        .slice(0, 8)
        .map((action) => ({
          actionId: action.id,
          actionTitle: action.title,
          publishedAt: action.publicMemory.publishedAt!,
          memorySummary: action.publicMemory.memorySummary,
          learnedSummary: action.publicMemory.learnedSummary,
          nextStepsSummary: action.publicMemory.nextStepsSummary,
          assets: action.publicMemory.assets.slice(0, 6).map((asset) => ({
            assetId: asset.id,
            kind: asset.assetKind,
            title: asset.title,
            publicUrl: asset.publicUrl,
          })),
        })),
      editorialSyntheses: input.dossiers.slice(0, 4).map((dossier) => ({
        dossierId: dossier.id,
        title: dossier.public_title,
        summary: dossier.public_summary,
        publicPath: `/comun/dossies/${dossier.public_slug}`,
        versionLabel: dossier.public_version_label || "versão publicada",
      })),
    },
    currentNextStep: nextStep,
    limitations: [...limitations],
  };
}
