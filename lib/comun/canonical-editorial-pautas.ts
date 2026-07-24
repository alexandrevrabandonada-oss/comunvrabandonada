import type { PautaSpace } from "@/lib/types";

export const CANONICAL_SIDEWALK_PAUTA_SLUG = "calcadas-em-circulacao";

export type EditorialPautaSpace = PautaSpace & {
  source: "editorial_fallback";
};

const zeroStats = {
  reportCount: 0,
  officialProtocolCount: 0,
  overdueProtocolCount: 0,
  waitingResponseCount: 0,
  resolvedCount: 0,
  unresolvedCount: 0,
  pendingContributionCount: 0,
  openTaskCount: 0,
};

export const canonicalSidewalkEditorialPauta: EditorialPautaSpace & {
  stats: typeof zeroStats;
} = {
  id: `editorial:${CANONICAL_SIDEWALK_PAUTA_SLUG}`,
  slug: CANONICAL_SIDEWALK_PAUTA_SLUG,
  title: "Calçadas em circulação",
  summary:
    "Uma pauta para identificar barreiras, organizar evidências verificadas e acompanhar soluções para a circulação a pé.",
  category: "mobilidade-e-acessibilidade",
  community: null,
  status: "organizing",
  visibility: "public",
  public_synthesis:
    "A pauta reúne o processo editorial do Mapa das Calçadas. Registros só aparecem depois de verificação e publicação sanitizada.",
  next_step: "Registrar e verificar situações no Mapa das Calçadas.",
  created_from_signal: "editorial_fallback",
  editorial_checklist: [],
  public_status: "Em construção",
  internal_status: "editorial_fallback",
  priority: "normal",
  urgency: "normal",
  risk_level: "normal",
  responsible_internal: null,
  responsible_public: "Equipe editorial COMUN",
  territory_id: null,
  affected_people_public:
    "Pessoas que circulam a pé, especialmente quem encontra barreiras de mobilidade.",
  problem_public:
    "Que barreiras dificultam a circulação segura e acessível nas calçadas de Volta Redonda?",
  demand_public: "Identificar, verificar e acompanhar barreiras de acessibilidade.",
  proposals_public: null,
  participation_public:
    "Envie um registro pelo mapa. A contribuição passa por revisão antes da publicação.",
  last_operational_update_at: "",
  created_at: "",
  updated_at: "",
  source: "editorial_fallback",
  stats: zeroStats,
};

export function shouldUseCanonicalEditorialFallback(input: {
  slug: string;
  queryFailed: boolean;
  rows: Array<{ visibility: string; status: string }>;
}) {
  return (
    input.slug === CANONICAL_SIDEWALK_PAUTA_SLUG &&
    !input.queryFailed &&
    input.rows.length === 0
  );
}
