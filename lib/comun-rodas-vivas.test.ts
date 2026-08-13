import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => null,
}));

import {
  projectPublicRodaV1,
  type RawRodaCircle,
  type RawRodaContribution,
  type RawRodaRound,
  type RawRodaSynthesis,
} from "./comun-rodas-vivas";
import { isComunRodasVivasEnabled } from "./comun-rodas-vivas-feature";

const circle: RawRodaCircle = {
  id: "circle-1",
  pauta_id: "pauta-1",
  title: "Roda da mobilidade",
  public_question: "Como melhorar a travessia?",
  public_context: "Conversa pública moderada.",
  status: "open",
  participation_mode: "moderated_public",
  current_round_id: "round-2",
  starts_at: null,
  closes_at: null,
};
const rounds: RawRodaRound[] = [
  {
    id: "round-1",
    circle_id: circle.id,
    title: "Escuta",
    public_prompt: "O que você observa?",
    public_guidance: null,
    status: "synthesized",
    position: 1,
    opens_at: null,
    closes_at: null,
  },
  {
    id: "round-2",
    circle_id: circle.id,
    title: "Propostas",
    public_prompt: "O que podemos fazer?",
    public_guidance: "Evite dados pessoais.",
    status: "open",
    position: 2,
    opens_at: null,
    closes_at: null,
  },
  {
    id: "round-3",
    circle_id: circle.id,
    title: "Planejada",
    public_prompt: "Depois",
    public_guidance: null,
    status: "planned",
    position: 3,
    opens_at: null,
    closes_at: null,
  },
];
const contributions: RawRodaContribution[] = [
  {
    id: "visible",
    circle_id: circle.id,
    round_id: "round-2",
    contribution_type: "proposal",
    public_body: "Criar uma travessia mais segura.",
    author_display_name: "  Ana\u0000  Silva ",
    anonymous_publication: false,
    status: "visible",
    created_at: "2026-08-13T10:00:00Z",
  },
  {
    id: "incorporated",
    circle_id: circle.id,
    round_id: "round-2",
    contribution_type: "question",
    public_body: "Qual é o próximo passo?",
    author_display_name: "Pessoa",
    anonymous_publication: true,
    status: "incorporated",
    created_at: "2026-08-13T11:00:00Z",
  },
  {
    id: "pending-private-marker",
    circle_id: circle.id,
    round_id: "round-2",
    contribution_type: "testimony",
    public_body: "PRIVATE_PENDING_SENTINEL",
    author_display_name: "PRIVATE_NAME",
    anonymous_publication: false,
    status: "pending",
    created_at: "2026-08-13T12:00:00Z",
  },
];
const syntheses: RawRodaSynthesis[] = [
  {
    id: "syn-1",
    circle_id: circle.id,
    round_id: "round-1",
    public_summary: "Síntese publicada.",
    agreements: ["Acordo"],
    disagreements: [],
    open_questions: [],
    missing_evidence: [],
    proposed_next_steps: ["Próxima etapa"],
    status: "published",
    published_at: "2026-08-13T12:00:00Z",
  },
];

beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

describe("COMUN 48.3-B1 public roda projection", () => {
  it("is feature-flagged fail closed", () => {
    expect(isComunRodasVivasEnabled({})).toBe(false);
    expect(
      isComunRodasVivasEnabled({ COMUN_RODAS_VIVAS_ENABLED: "enabled" }),
    ).toBe(true);
    expect(
      isComunRodasVivasEnabled({ COMUN_RODAS_VIVAS_ENABLED: "true" }),
    ).toBe(false);
  });

  it("uses only the exact current open round and hides planned rounds", () => {
    const result = projectPublicRodaV1({
      circle,
      rounds,
      contributions,
      syntheses,
    });
    expect(result?.currentRound?.id).toBe("round-2");
    expect(result?.currentRound?.canParticipate).toBe(true);
    expect(result?.pastRounds.map((round) => round.id)).toEqual(["round-1"]);
  });

  it.each(["draft", "paused", "archived"])("hides a %s circle", (status) => {
    expect(
      projectPublicRodaV1({
        circle: { ...circle, status },
        rounds,
        contributions,
        syntheses,
      }),
    ).toBeNull();
  });

  it.each(["pending", "restricted", "rejected", "archived"])(
    "hides a %s contribution",
    (status) => {
      const hidden = {
        ...contributions[0],
        id: `hidden-${status}`,
        status,
        public_body: `HIDDEN_${status}`,
      };
      const result = projectPublicRodaV1({
        circle,
        rounds,
        contributions: [hidden],
        syntheses,
      });
      expect(result?.currentRound?.contributions).toEqual([]);
      expect(JSON.stringify(result)).not.toContain(`HIDDEN_${status}`);
    },
  );

  it.each(["draft", "review", "superseded", "archived"])(
    "hides a %s synthesis",
    (status) => {
      const result = projectPublicRodaV1({
        circle,
        rounds,
        contributions,
        syntheses: [{ ...syntheses[0], status }],
      });
      expect(result?.pastRounds[0].synthesis).toEqual({ state: "none" });
    },
  );

  it("never falls back to another open round", () => {
    const result = projectPublicRodaV1({
      circle: { ...circle, current_round_id: null },
      rounds,
      contributions,
      syntheses,
    });
    expect(result?.currentRound).toBeNull();
    expect(
      result?.pastRounds.find((round) => round.id === "round-2")
        ?.canParticipate,
    ).toBe(false);
  });

  it("shows visible/incorporated contributions only and sanitizes author labels", () => {
    const result = projectPublicRodaV1({
      circle,
      rounds,
      contributions,
      syntheses,
    });
    expect(result?.currentRound?.contributions.map((item) => item.id)).toEqual([
      "visible",
      "incorporated",
    ]);
    expect(result?.currentRound?.contributions[0].publicAuthorLabel).toBe(
      "Ana Silva",
    );
    expect(result?.currentRound?.contributions[1].publicAuthorLabel).toBe(
      "Participação anônima",
    );
    expect(JSON.stringify(result)).not.toContain("PRIVATE_PENDING_SENTINEL");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_NAME");
  });

  it("publishes exactly one synthesis and fails closed on duplicates", () => {
    const ok = projectPublicRodaV1({
      circle,
      rounds,
      contributions,
      syntheses,
    });
    expect(ok?.pastRounds[0].synthesis.state).toBe("published");
    const conflict = projectPublicRodaV1({
      circle,
      rounds,
      contributions,
      syntheses: [...syntheses, { ...syntheses[0], id: "syn-2" }],
    });
    expect(conflict?.pastRounds[0].synthesis).toEqual({ state: "unavailable" });
    expect(console.error).toHaveBeenCalledWith(
      "COMUN_RODAS_VIVAS_SYNTHESIS_INTEGRITY_CONFLICT",
    );
  });

  it("does not expose private fields or the legacy hardcoded narrative", () => {
    const source = JSON.stringify(
      projectPublicRodaV1({ circle, rounds, contributions, syntheses }),
    );
    for (const forbidden of [
      "private_contact",
      "moderation_note_private",
      "author_member_id",
      "related_evidence_id",
      "public_protocol",
      "receipt",
      "wallet",
      "original_text",
    ])
      expect(source).not.toContain(forbidden);
  });
});
