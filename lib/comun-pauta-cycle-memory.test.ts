import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPublicEvidenceCitationV1 } from "./comun-public-evidence";
import {
  derivePublicPautaCycleMemoryV1,
  PAUTA_CYCLE_MEMORY_CONTRACT,
} from "./comun-pauta-cycle-memory";
import { isComunPautaCycleMemoryEnabled } from "./comun-pauta-cycle-memory-feature";
import type { PublicCollectiveActionDetailV1 } from "./comun-collective-actions-canonical";
import type { PublicRodaV1 } from "./comun-rodas-vivas";
import type { PublicPautaActionCycleV1 } from "./pauta-action-cycle-data";
import type { PublicPautaEvidenceItem, PublicPautaSpace } from "./pauta-spaces";

const pauta = {
  id: "pauta-1",
  slug: "travessia-segura",
  title: "Travessia segura",
  status: "organizing",
  summary: "Uma pauta pública sobre travessia.",
  problem_public: "Como tornar a travessia mais segura?",
  demand_public: "Construir uma resposta coletiva verificável.",
  next_step: "Acompanhar o resultado publicado.",
} as PublicPautaSpace;

const citation = createPublicEvidenceCitationV1({
  refId: "panorama:territory:data-gap:education",
  observatoryId: "territory",
  layerId: "education",
  claimKind: "data_gap",
  title: "Educação ainda em validação de fontes",
  publicPath: "/comun/observatorios/panorama",
  sourceKind: "official_public_data",
  referencePeriod: "Censo 2022",
  sourceRefs: ["territory-snapshot-v1"],
  limitations: ["A fonte pública ainda não foi reconciliada."],
});

const evidence: PublicPautaEvidenceItem = {
  id: "evidence-1",
  pauta_id: pauta.id,
  source_type: "public_evidence",
  title: "Lacuna pública documentada",
  summary: "O contrato atual registra a limitação sem afirmar ausência absoluta.",
  evidence_type: "dado_agregado",
  sensitivity: "public_safe",
  status: "approved",
  public_note: null,
  public_evidence_ref_id: citation.refId,
  public_evidence_version: citation.versionId,
  public_evidence_payload: citation,
  created_at: "2026-08-14T09:00:00Z",
};

const roda: PublicRodaV1 = {
  id: "roda-1",
  pautaId: pauta.id,
  title: "Roda da travessia",
  publicQuestion: "O que precisamos priorizar?",
  publicContext: null,
  status: "completed",
  participationMode: "moderated_public",
  startsAt: "2026-08-01T10:00:00Z",
  closesAt: "2026-08-05T10:00:00Z",
  currentRound: null,
  pastRounds: [
    {
      id: "round-1",
      title: "Escuta",
      publicPrompt: "O que aprendemos?",
      publicGuidance: null,
      status: "synthesized",
      position: 1,
      opensAt: null,
      closesAt: null,
      isCurrent: false,
      canParticipate: false,
      contributions: [],
      contributionsTruncated: false,
      synthesis: {
        state: "published",
        publicSummary: "A síntese pública reuniu os pontos comuns.",
        agreements: ["Priorizar segurança"],
        disagreements: ["Forma de execução"],
        openQuestions: ["Qual é o prazo?"],
        missingEvidence: [],
        proposedNextSteps: ["Organizar uma ação"],
        publishedAt: "2026-08-05T12:00:00Z",
      },
    },
  ],
  publishedSynthesisState: "published",
};

const action: PublicCollectiveActionDetailV1 = {
  id: "action-1",
  slug: "mutirao-travessia",
  title: "Mutirão da travessia",
  summary: "Ação pública delimitada.",
  objective: "Executar e documentar uma etapa concreta.",
  actionType: "mutual_aid",
  status: "completed",
  territoryLabel: "Volta Redonda",
  meetingPlace: null,
  startsAt: "2026-08-06T10:00:00Z",
  endsAt: "2026-08-07T10:00:00Z",
  participationMode: "in_person",
  pauta: { slug: pauta.slug, title: pauta.title },
  community: null,
  tasks: [],
  publicUpdates: [
    {
      id: "update-1",
      updateType: "progress",
      title: "Etapa realizada",
      publicSummary: "O trabalho público foi registrado.",
      occurredAt: "2026-08-07T10:00:00Z",
    },
  ],
  publicForwarding: null,
  publicMemory: {
    publishedAt: "2026-08-08T10:00:00Z",
    resultStatus: "partial",
    resultSummary: "Parte do objetivo foi alcançada.",
    memorySummary: "A memória pública preserva a tentativa e seus limites.",
    learnedSummary: "A próxima etapa precisa de outra instituição.",
    nextStepsSummary: "Acompanhar a resposta institucional.",
    assets: [],
  },
  aggregateCounts: {
    interested: 0,
    participating: 0,
    tasksAssumed: 0,
    updates: 1,
    results: 1,
  },
};

const cycle: PublicPautaActionCycleV1 = {
  currentStage: "memory",
  nextAction: "Reavaliar quando houver nova evidência.",
  blockingReason: null,
  responsibleRole: null,
  lastTransitionAt: "2026-08-08T10:00:00Z",
  memoryPublishedAt: "2026-08-08T10:00:00Z",
  timeline: [],
  decision: {
    public_title: "Priorizar a travessia",
    public_summary: "A decisão pública delimitou uma ação.",
    public_justification: "A síntese reuniu evidências públicas.",
    decided_at: "2026-08-05T13:00:00Z",
    published_at: "2026-08-05T14:00:00Z",
  },
  action: {
    slug: action.slug,
    title: action.title,
    summary: action.summary,
    status: action.status,
  },
  protocol: {
    comun_protocol: "COMUN-D1-1",
    official_protocol_number: "OFICIAL-D1-1",
    status: "response_received",
    expected_response_at: null,
    public_summary: "Etapa institucional pública acompanhada.",
    response_received_at: "2026-08-08T08:00:00Z",
  },
  result: {
    title: "Mudança parcial verificada",
    result_type: "partial_change",
    public_summary: "A mudança foi verificada separadamente.",
    verification_status: "verified",
    occurred_at: "2026-08-08T09:00:00Z",
    evidence_summary_public: "Registro público revisado.",
  },
};

function derive(overrides: Partial<Parameters<typeof derivePublicPautaCycleMemoryV1>[0]> = {}) {
  return derivePublicPautaCycleMemoryV1({
    pauta,
    evidence: [evidence],
    rodas: [roda],
    actions: [action],
    actionCycle: cycle,
    dossiers: [],
    ...overrides,
  });
}

describe("COMUN 48.3-D1 canonical collective cycle memory", () => {
  it("is fail closed behind the exact feature flag", () => {
    expect(isComunPautaCycleMemoryEnabled({})).toBe(false);
    expect(
      isComunPautaCycleMemoryEnabled({
        COMUN_PAUTA_CYCLE_MEMORY_ENABLED: "enabled",
      }),
    ).toBe(true);
    expect(
      isComunPautaCycleMemoryEnabled({
        COMUN_PAUTA_CYCLE_MEMORY_ENABLED: "true",
      }),
    ).toBe(false);
  });

  it("composes canonical public chapters without using a search document", () => {
    const memory = derive({
      searchDocument: "DIVERGENT_SEARCH_INDEX_SENTINEL",
    } as never);
    expect(memory.contractVersion).toBe(PAUTA_CYCLE_MEMORY_CONTRACT);
    expect(memory.chapters.conversation[0].rounds).toHaveLength(1);
    expect(memory.chapters.decisions[0].title).toBe("Priorizar a travessia");
    expect(memory.chapters.actions[0].relation).toBe("explicit_cycle_link");
    expect(memory.chapters.actions[0].institutionalProtocol).toMatchObject({
      kind: "official",
      code: "OFICIAL-D1-1",
    });
    expect(memory.chapters.results[0].state).toBe("confirmed");
    expect(memory.chapters.learnings[0].learnedSummary).toContain("instituição");
    expect(memory.limitations).toContain("Educação ainda em validação de fontes");
    expect(JSON.stringify(memory)).not.toContain("DIVERGENT_SEARCH_INDEX_SENTINEL");
  });

  it("keeps partial histories coherent", () => {
    const issueOnly = derive({ evidence: [], rodas: [], actions: [], actionCycle: null });
    expect(issueOnly.chapters.issue.problem).toBeTruthy();
    expect(issueOnly.chapters.conversation).toEqual([]);
    expect(issueOnly.chapters.results).toEqual([]);

    const rodaWithoutSynthesis = derive({
      actions: [],
      actionCycle: null,
      rodas: [
        {
          ...roda,
          pastRounds: [{ ...roda.pastRounds[0], synthesis: { state: "none" } }],
          publishedSynthesisState: "none",
        },
      ],
    });
    expect(rodaWithoutSynthesis.chapters.conversation[0].rounds).toEqual([]);

    const synthesisWithoutDecision = derive({ actions: [], actionCycle: null });
    expect(synthesisWithoutDecision.chapters.conversation[0].rounds).toHaveLength(1);
    expect(synthesisWithoutDecision.chapters.decisions).toEqual([]);

    const decisionWithoutAction = derive({
      actions: [],
      actionCycle: { ...cycle, action: null, result: null },
    });
    expect(decisionWithoutAction.chapters.decisions).toHaveLength(1);
    expect(decisionWithoutAction.chapters.actions).toEqual([]);

    const actionWithoutResult = derive({
      actions: [
        {
          ...action,
          status: "active",
          publicMemory: {
            ...action.publicMemory,
            publishedAt: null,
            resultSummary: null,
          },
        },
      ],
      actionCycle: null,
    });
    expect(actionWithoutResult.chapters.actions).toHaveLength(1);
    expect(actionWithoutResult.chapters.results).toEqual([]);
  });

  it("does not invent causality for objects that only share a pauta", () => {
    const memory = derive({ actionCycle: { ...cycle, action: null } });
    expect(memory.chapters.actions[0].relation).toBe("same_pauta_context");
    expect(JSON.stringify(memory)).not.toMatch(/roda (?:gerou|criou) esta ação/i);
  });

  it.each([
    ["verified", "confirmed"],
    ["pending", "in_verification"],
    ["disputed", "contested"],
  ] as const)("maps %s results to %s", (verification, expected) => {
    const memory = derive({
      actions: [],
      actionCycle: {
        ...cycle,
        result: { ...cycle.result!, verification_status: verification },
      },
    });
    expect(memory.chapters.results[0].state).toBe(expected);
  });

  it("omits superseded results from the current narrative", () => {
    const memory = derive({
      actions: [],
      actionCycle: {
        ...cycle,
        result: { ...cycle.result!, verification_status: "superseded" },
      },
    });
    expect(memory.chapters.results).toEqual([]);
  });

  it("never serializes fields outside public DTO allowlists", () => {
    const memory = derive({
      actions: [
        {
          ...action,
          private_note: "PRIVATE_NOTE_SENTINEL",
          member_user_id: "PRIVATE_MEMBER_SENTINEL",
          storage_path: "PRIVATE_STORAGE_SENTINEL",
        } as never,
      ],
    });
    const serialized = JSON.stringify(memory);
    for (const forbidden of [
      "PRIVATE_NOTE_SENTINEL",
      "PRIVATE_MEMBER_SENTINEL",
      "PRIVATE_STORAGE_SENTINEL",
      "user_id",
      "contact_private",
      "moderation_note_private",
      "signed_url",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("makes concluded pauta memory primary without changing source facts", () => {
    const memory = derive({ pauta: { ...pauta, status: "resolved" } });
    expect(memory.currentState).toBe("concluded");
    expect(memory.chapters.issue.problem).toBe(pauta.problem_public);
  });
});
