export const COMUN_SOCIAL_ARCHITECTURE_VERSION =
  "comun-social-architecture-v1" as const;

export const socialReconciliationDecisions = [
  "REUSE_CANONICAL",
  "REUSE_WITH_EXTENSION",
  "DERIVED_LAYER",
  "LEGACY_KEEP_COMPAT",
  "DEPRECATE_CONCEPTUALLY",
  "UNRELATED",
] as const;

export type SocialReconciliationDecision =
  (typeof socialReconciliationDecisions)[number];

export const socialEntityKinds = [
  "community",
  "pauta",
  "roda",
  "round",
  "contribution",
  "synthesis",
  "work_group",
  "action",
] as const;

export type SocialEntityKind = (typeof socialEntityKinds)[number];

export type SocialStructureDecision = {
  readonly structure: string;
  readonly kind: SocialEntityKind;
  readonly decision: SocialReconciliationDecision;
  readonly canonicalRole: string;
  readonly publicBoundary: string;
  readonly writeBoundary: string;
  readonly risk: string;
};

export const socialStructureDecisions = [
  {
    structure: "comun_communities",
    kind: "community",
    decision: "REUSE_CANONICAL",
    canonicalRole:
      "Vínculo social durável, opcional e distinto da pauta que contextualiza várias questões ao longo do tempo.",
    publicBoundary: "Somente comunidades ativas e seus campos institucionais públicos.",
    writeBoundary: "Administração no servidor; nenhum cliente escreve diretamente.",
    risk: "Não converter comunidade em pauta nem tratar o catálogo hardcoded como fonte canônica.",
  },
  {
    structure: "comun_community_memberships",
    kind: "community",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Pertencimento e acompanhamento de uma pessoa em uma comunidade.",
    publicBoundary: "O vínculo é privado; a pessoa autenticada lê somente o próprio registro.",
    writeBoundary: "Fluxo server-side; acompanhar é reversível e entrar como membro possui gate atual separado.",
    risk: "Não propagar automaticamente este vínculo para pautas, rodas, grupos ou ações.",
  },
  {
    structure: "comun_community_role_assignments",
    kind: "community",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Responsabilidade comunitária revogável e escopada.",
    publicBoundary: "A pessoa lê apenas os próprios papéis ativos; listas permanecem server-only.",
    writeBoundary: "Concessão e revogação administrativas no servidor.",
    risk: "O scope é texto livre e não deve ser interpretado como autorização universal.",
  },
  {
    structure: "comun_pauta_spaces",
    kind: "pauta",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Questão coletiva durável que se quer entender ou mudar.",
    publicBoundary: "Somente a projeção pública de pautas não arquivadas.",
    writeBoundary: "Núcleo A1 e administração server-side; sem publicação automática.",
    risk: "O campo community é um slug textual legado, não uma relação social canônica.",
  },
  {
    structure: "comun_pauta_memberships",
    kind: "pauta",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Acompanhamento e papel da pessoa dentro de uma pauta específica.",
    publicBoundary: "Vínculo privado, exposto somente à própria pessoa por superfície server-side.",
    writeBoundary: "Seguir e sair da pauta são gestos autenticados e reversíveis.",
    risk: "Não confundir com membership comunitária nem exigir comunidade para acompanhar pauta.",
  },
  {
    structure: "comun_construction_circles",
    kind: "roda",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Processo estruturado, com objetivo e estado, pertencente a exatamente uma pauta.",
    publicBoundary: "Somente estados explicitamente públicos, projetados pelo servidor.",
    writeBoundary: "Administração e facilitação server-side.",
    risk: "A projeção pública atual precisa filtrar também rounds e sínteses filhos, não apenas a roda pai.",
  },
  {
    structure: "comun_construction_circle_rounds",
    kind: "round",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Etapa ordenada de uma roda; no máximo uma etapa aberta por roda.",
    publicBoundary: "Prompt e orientação públicos somente quando o estado da etapa permitir.",
    writeBoundary: "Transições server-side com guarda de uma rodada aberta.",
    risk: "Não apresentar etapas planejadas ou arquivadas como conversa pública ativa.",
  },
  {
    structure: "comun_circle_contributions",
    kind: "contribution",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Participação individual estruturada em uma rodada aberta.",
    publicBoundary: "Somente corpo sanitizado em estado visible ou incorporated; contato e moderação são privados.",
    writeBoundary: "Submissão server-side moderada; a rodada precisa pertencer à roda e estar aberta.",
    risk: "Nunca publicar automaticamente nem copiar contato privado para a superfície pública.",
  },
  {
    structure: "comun_pauta_contributions",
    kind: "contribution",
    decision: "LEGACY_KEEP_COMPAT",
    canonicalRole: "Caixa geral moderada de contribuições históricas da pauta, fora de uma rodada tipada.",
    publicBoundary: "Tabela server-only; somente projeção aprovada e sanitizada pode aparecer.",
    writeBoundary: "Submissão e moderação server-side.",
    risk: "Não fazer dual-write nem copiar automaticamente conteúdo para contribuições da roda.",
  },
  {
    structure: "comun_circle_syntheses",
    kind: "synthesis",
    decision: "REUSE_WITH_EXTENSION",
    canonicalRole: "Síntese de uma rodada, preservando acordos, divergências e próximos passos.",
    publicBoundary: "Somente sínteses published e campos explicitamente públicos.",
    writeBoundary: "Facilitação e revisão server-side.",
    risk: "O schema não impõe uma única síntese publicada vigente por rodada.",
  },
  {
    structure: "comun_pauta_synthesis_versions",
    kind: "synthesis",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Memória versionada da síntese e do próximo passo da pauta.",
    publicBoundary: "Histórico interno; a pauta expõe sua projeção pública atual.",
    writeBoundary: "Edição server-side versionada.",
    risk: "Não substituir nem duplicar a síntese própria de cada rodada.",
  },
  {
    structure: "comun_community_work_groups",
    kind: "work_group",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Núcleo operacional temporário ligado a uma comunidade e a uma pauta concretas.",
    publicBoundary: "Somente grupos active ou completed e suas tarefas públicas vinculadas.",
    writeBoundary: "Criação e composição atualmente administrativas no servidor.",
    risk: "Presença no grupo exige membership da mesma comunidade; grupo não é roda nem ação.",
  },
  {
    structure: "comun_collective_actions",
    kind: "action",
    decision: "REUSE_CANONICAL",
    canonicalRole: "Mobilização concreta, separada da pauta, da roda e do grupo de trabalho.",
    publicBoundary: "Somente ação explicitamente publicada e campos public-safe.",
    writeBoundary: "Fluxo próprio de ação e memória, fora do B0.",
    risk: "Não converter síntese ou grupo em ação automaticamente.",
  },
  {
    structure: "comun_pauta_modules",
    kind: "pauta",
    decision: "DERIVED_LAYER",
    canonicalRole: "Configuração opcional de superfície/miniapp que serve a pauta.",
    publicBoundary: "Somente módulos active e public.",
    writeBoundary: "Administração server-side.",
    risk: "Miniapp não é identidade, comunidade ou pré-requisito de uma pauta.",
  },
  {
    structure: "community-experience.ts",
    kind: "community",
    decision: "DEPRECATE_CONCEPTUALLY",
    canonicalRole: "Narrativa estática de compatibilidade da experiência comunitária atual.",
    publicBoundary: "Somente copy pública, mas não representa o estado canônico do banco.",
    writeBoundary: "Código versionado, sem write path de negócio.",
    risk: "Contém grupos/roda demonstrativos e pode divergir silenciosamente das estruturas canônicas.",
  },
] as const satisfies readonly SocialStructureDecision[];

export const canonicalSocialGrammar = {
  community:
    "Vínculo social durável em torno de território, tema, identidade coletiva ou propósito.",
  pauta: "Questão coletiva durável que se quer entender ou mudar.",
  roda: "Processo estruturado de conversa e construção pertencente a uma pauta.",
  round: "Etapa ordenada de uma roda.",
  contribution: "Participação individual em uma pauta ou, preferencialmente, em uma rodada tipada.",
  workGroup: "Núcleo operacional temporário que assume trabalho concreto.",
  action: "Objeto concreto de mobilização com ciclo e memória próprios.",
} as const;

export const canonicalSocialCardinalities = {
  communityToPautas: {
    desired: "many_to_many_optional",
    current: "one_optional_legacy_slug_on_pauta",
    supportedNow: false,
  },
  pautaToRodas: "one_to_many",
  rodaToRounds: "one_to_many_with_at_most_one_open",
  roundToContributions: "one_to_many",
  roundToSyntheses: {
    current: "one_to_many",
    desired: "versioned_with_at_most_one_published_current",
    supportedNow: false,
  },
  communityAndPautaToWorkGroups: "each_work_group_belongs_to_exactly_one_of_each",
  communityMembershipToWorkGroups: "many_to_many_with_same_community_guard",
  pautaToActions: "zero_to_many",
} as const;

export const canonicalParticipationBoundaries = {
  communityMembershipDoesNotGrantPautaMembership: true,
  pautaMembershipDoesNotGrantCommunityMembership: true,
  rodaContributionDoesNotRequireCommunityMembership: true,
  generalContributionIsNotCopiedIntoRoda: true,
  contributionDoesNotPublishAutomatically: true,
  roundSynthesisDoesNotBecomePautaSynthesisAutomatically: true,
  workGroupDoesNotBecomeActionAutomatically: true,
  privateReportDoesNotBecomeSocialContentAutomatically: true,
} as const;

export const b0ArchitectureDecision = {
  community: "reuse_existing_as_optional_context",
  pauta: "reuse_pauta_spaces_as_canonical_issue",
  roda: "reuse_construction_circles_as_structured_process",
  round: "reuse_circle_rounds_as_process_stages",
  contributions: "circle_contributions_canonical_inside_roda",
  generalContributions: "legacy_keep_compatible_outside_roda",
  syntheses: "keep_round_and_pauta_syntheses_distinct",
  workGroups: "reuse_as_operational_nucleus",
  actions: "reuse_as_distinct_action_object",
  communityPautaLink: "needs_explicit_relation_before_many_to_many",
  publicCircleProjection: "needs_child_status_filtering",
  nextSlice: "48.3-B1",
} as const;

export function getSocialStructureDecision(structure: string) {
  return socialStructureDecisions.find((item) => item.structure === structure) ?? null;
}
