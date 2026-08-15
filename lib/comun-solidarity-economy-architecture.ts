export const COMUN_SOLIDARITY_ECONOMY_ARCHITECTURE_VERSION =
  "comun-solidarity-economy-architecture-v1" as const;

export const solidarityEconomyReconciliationDecisions = [
  "REUSE_CANONICAL",
  "REUSE_WITH_EXTENSION",
  "DERIVED_LAYER",
  "LEGACY_KEEP_COMPAT",
  "DEPRECATE_CONCEPTUALLY",
  "UNRELATED",
] as const;

export type SolidarityEconomyReconciliationDecision =
  (typeof solidarityEconomyReconciliationDecisions)[number];

export const solidarityEconomyEntityKinds = [
  "organization",
  "offer",
  "need",
  "interest",
  "exchange",
  "territory",
  "pauta",
  "action",
  "community",
  "surface",
  "specialized_recycling",
  "search",
] as const;

export type SolidarityEconomyEntityKind =
  (typeof solidarityEconomyEntityKinds)[number];

export type SolidarityEconomyStructureDecision = {
  readonly structure: string;
  readonly kind: SolidarityEconomyEntityKind;
  readonly decision: SolidarityEconomyReconciliationDecision;
  readonly currentRole: string;
  readonly futureRole: string;
  readonly publicBoundary: string;
  readonly privateBoundary: string;
  readonly writeBoundary: string;
  readonly migrationNeeded: boolean;
  readonly risk: string;
};

export const canonicalSolidarityEconomyGrammar = {
  organization:
    "Ator econômico ou comunitário durável, com identidade e governança próprias.",
  offer:
    "Algo delimitado e potencialmente temporário que um ator disponibiliza para venda, troca, doação, empréstimo, cessão, apoio ou cooperação.",
  need: "Algo delimitado de que uma organização, comunidade ou território precisa, com ciclo próprio e memória após atendimento.",
  interest:
    "Gesto privado e consentido de tentar conectar-se a uma necessidade ou, futuramente, a uma oferta.",
  exchange:
    "Relação eventual e privada que só pode existir depois de gestos explícitos das partes; não é pedido nem pagamento.",
  territory:
    "Contexto público opcional de origem, atuação ou atendimento; não é a identidade econômica em si.",
  pauta:
    "Questão política ou social distinta, ligada à economia somente por relação opcional e explícita.",
  action:
    "Mobilização concreta distinta, que pode responder a uma necessidade sem nascer automaticamente dela.",
  community:
    "Vínculo social durável e opcional; cooperativa ou organização econômica não vira Comunidade automaticamente.",
  surface:
    "Experiência de descoberta de quem oferece, quem precisa e como cooperar; não é entidade de banco.",
} as const;

export const solidarityEconomyStructureDecisions = [
  {
    structure: "comun_hub_territories",
    kind: "territory",
    decision: "REUSE_CANONICAL",
    currentRole:
      "Raiz territorial pública e identidade técnica atual das especializações do Mapa Popular.",
    futureRole:
      "Contexto territorial canônico opcional; continua referenciado sem substituir a identidade econômica.",
    publicBoundary:
      "Somente território public, não archived e com verificação diferente de unverified; localização pública segue precisão segura.",
    privateBoundary:
      "private_location, responsável e notas internas permanecem server-only.",
    writeBoundary: "Admin/editor no servidor; contribuições públicas entram moderadas.",
    migrationNeeded: false,
    risk: "Usar territory_id como única identidade impede representar um ator em vários territórios sem extensão explícita.",
  },
  {
    structure: "comun_territorial_organizations",
    kind: "organization",
    decision: "REUSE_WITH_EXTENSION",
    currentRole:
      "Perfil durável de cooperativa, associação, coletivo, grupo informal, empreendimento solidário ou rede, 1:1 com território.",
    futureRole:
      "Raiz canônica inicial de organizações econômicas; A1 deve preservar a chave existente e acrescentar somente as relações que o produto comprovar.",
    publicBoundary:
      "A organização filha precisa de gate próprio explícito de status e verification_status além do gate do território pai.",
    privateBoundary:
      "private_contact e internal_notes nunca entram em projeção pública; contato público exige valor explicitamente autorizado.",
    writeBoundary:
      "Hoje admin/editor via service role; futura autodeclaração deve salvar privada/pendente antes de qualquer publicação.",
    migrationNeeded: false,
    risk: "A projeção listPublicMapData atual não aplica filtros próprios à organização filha; gap obrigatório para A1.",
  },
  {
    structure: "comun_territorial_organization_materials",
    kind: "specialized_recycling",
    decision: "DERIVED_LAYER",
    currentRole: "Relaciona organizações a materiais do domínio de reciclagem.",
    futureRole:
      "Especialização de reciclagem reutilizável; não representa catálogo geral, produto ou oferta.",
    publicBoundary: "Somente material ativo e nota pública revisada.",
    privateBoundary: "Curadoria operacional permanece server-only.",
    writeBoundary: "Admin/editor no servidor.",
    migrationNeeded: false,
    risk: "Generalizar material reciclável como produto distorceria a semântica do domínio.",
  },
  {
    structure: "comun_territorial_needs",
    kind: "need",
    decision: "REUSE_WITH_EXTENSION",
    currentRole:
      "Necessidade territorial ou organizacional com tipo, ciclo, visibilidade e vínculos opcionais.",
    futureRole:
      "Objeto canônico de necessidade, preservando histórico e adicionando apenas vínculo novo com Ação canônica quando necessário.",
    publicBoundary:
      "Somente visibility=public e estados open ou partially_met na projeção atual.",
    privateBoundary:
      "responsible_internal e internal_notes permanecem server-only; ausência de dado nunca vira zero ou atendimento.",
    writeBoundary: "Hoje admin/editor; interesses usam fluxo privado separado.",
    migrationNeeded: false,
    risk: "action_id e task_id apontam para o ciclo legado de mobilização; novos vínculos não podem reforçar essa raiz.",
  },
  {
    structure: "comun_territorial_need_interests",
    kind: "interest",
    decision: "REUSE_CANONICAL",
    currentRole:
      "Manifestação privada de ajuda ligada exclusivamente a uma necessidade.",
    futureRole:
      "Ponte canônica somente para necessidades; ofertas futuras exigem vínculo próprio ou extensão explicitamente revisada.",
    publicBoundary: "Nenhuma linha ou contato é público por default.",
    privateBoundary:
      "contact_private, offer_private, consent_to_contact e estado operacional são server-only.",
    writeBoundary: "Fluxo server-side consentido; nenhuma publicação ou contato automático.",
    migrationNeeded: false,
    risk: "O nome offer_private descreve a mensagem de ajuda, não uma Oferta econômica estruturada.",
  },
  {
    structure: "comun_recycling_materials + comun_recycling_points + comun_collection_routes",
    kind: "specialized_recycling",
    decision: "REUSE_CANONICAL",
    currentRole:
      "Catálogo, pontos e rotas especializados de reciclagem com status e verificação próprios.",
    futureRole:
      "Caso especializado que pode aparecer na descoberta econômica sem virar modelo genérico de oferta.",
    publicBoundary:
      "Somente material ativo e campos públicos moderados; ponto/rota precisam de estados públicos allowlisted.",
    privateBoundary: "internal_notes e dados operacionais não autorizados permanecem server-only.",
    writeBoundary: "Admin/editor no servidor.",
    migrationNeeded: false,
    risk: "Confundir aceitação de material ou rota de coleta com produto, estoque ou entrega comercial.",
  },
  {
    structure: "listPublicMapData",
    kind: "surface",
    decision: "DERIVED_LAYER",
    currentRole:
      "Agrega territórios, camadas, reciclagem, organizações, necessidades e propriedades para superfícies do Mapa Popular.",
    futureRole:
      "Fonte derivada de contexto geográfico; a Feirinha terá projeção econômica fail-closed própria em A1.",
    publicBoundary:
      "DTO econômico deve selecionar campos explicitamente e aplicar gates por entidade filha.",
    privateBoundary: "Nunca selecionar private_contact, internal_notes ou localização privada.",
    writeBoundary: "Read-only server-side.",
    migrationNeeded: false,
    risk: "O agregador atual herda segurança do território pai e não filtra status/verificação da organização filha.",
  },
  {
    structure: "/comun/cooperativas",
    kind: "surface",
    decision: "REUSE_WITH_EXTENSION",
    currentRole:
      "Diretório público simples derivado do Mapa Popular, sem ranking e sem write próprio.",
    futureRole:
      "Rota canônica a recompor como descoberta de economia solidária; não criar /feirinha-v2.",
    publicBoundary: "Somente DTO econômico fail-closed futuro.",
    privateBoundary: "Nenhum contato ou interesse privado no HTML.",
    writeBoundary: "Nenhum write no A0.",
    migrationNeeded: false,
    risk: "Hoje a tela é um filtro do mapa e não distingue perfil, oferta e necessidade.",
  },
  {
    structure: "comun_pauta_spaces",
    kind: "pauta",
    decision: "REUSE_CANONICAL",
    currentRole: "Questão coletiva durável, já relacionada opcionalmente a necessidades.",
    futureRole: "Contexto político/social opcional e explícito.",
    publicBoundary: "Somente Pauta pública pela projeção A1 de Pautas Vivas.",
    privateBoundary: "Relato privado nunca é convertido em Pauta ou objeto econômico.",
    writeBoundary: "Fluxos canônicos de Pauta; sem criação automática pela economia solidária.",
    migrationNeeded: false,
    risk: "Transformar organização, oferta ou necessidade automaticamente em Pauta.",
  },
  {
    structure: "comun_collective_actions",
    kind: "action",
    decision: "REUSE_CANONICAL",
    currentRole: "Ação coletiva canônica definida em 48.3-C1.",
    futureRole: "Destino exclusivo de novos vínculos econômicos com ações concretas.",
    publicBoundary: "Somente projeção pública canônica de Ações.",
    privateBoundary: "Participações, atribuições e dados internos seguem seus contratos próprios.",
    writeBoundary: "Fluxo canônico de Ações; nunca criado automaticamente por necessidade ou oferta.",
    migrationNeeded: false,
    risk: "Criar dual-write ou inferir ação a partir de necessidade.",
  },
  {
    structure: "comun_territorial_needs.action_id + comun_territorial_social_use_proposals.action_id",
    kind: "action",
    decision: "LEGACY_KEEP_COMPAT",
    currentRole: "FKs históricas para comun_mobilization_actions.",
    futureRole:
      "Compatibilidade somente; novos links devem preferir comun_collective_actions quando um caso de produto exigir relação.",
    publicBoundary: "Nenhuma projeção nova deve usar a ação legada como verdade canônica.",
    privateBoundary: "Sem migração ou reconciliação de dados neste A0.",
    writeBoundary: "Nenhum write novo para comun_mobilization_actions.",
    migrationNeeded: false,
    risk: "Reviver a raiz legada de mobilização e dividir novamente o conceito de Ação.",
  },
  {
    structure: "comun_communities",
    kind: "community",
    decision: "UNRELATED",
    currentRole: "Comunidade social canônica sem relação explícita com organização econômica.",
    futureRole: "Contexto opcional futuro, somente mediante relação explícita.",
    publicBoundary: "Somente comunidade ativa pela projeção social canônica.",
    privateBoundary: "Memberships e papéis não entram em perfis econômicos.",
    writeBoundary: "Nenhuma criação ou associação automática.",
    migrationNeeded: false,
    risk: "Assumir que cooperativa é Comunidade ou fazer join por nome/slug.",
  },
  {
    structure: "comun_search_documents",
    kind: "search",
    decision: "DERIVED_LAYER",
    currentRole:
      "Índice de descoberta que hoje indexa o território pai, não organizações/necessidades como entidades econômicas autônomas.",
    futureRole:
      "Descoberta derivada após existir projeção pública econômica estável; nunca source of truth.",
    publicBoundary: "Somente texto já publicável e rota canônica.",
    privateBoundary: "Contato, interesse, localização privada e conteúdo interno nunca são indexados.",
    writeBoundary: "Reindexação server-side controlada.",
    migrationNeeded: false,
    risk: "Usar busca textual para criar relações econômicas ou publicar conteúdo não revisado.",
  },
] as const satisfies readonly SolidarityEconomyStructureDecision[];

export const solidarityEconomyPrivacyBoundary = {
  organization: {
    public: [
      "public_name",
      "organization_type",
      "eligible_public_status",
      "eligible_verification_status",
      "presentation_public",
      "services_public_as_profile_copy",
      "explicitly_authorized_public_contact_value",
      "last_verified_at",
    ],
    private: ["private_contact", "internal_notes"],
    serverOnly: ["governance_and_verification_workflow"],
  },
  offer: {
    public: ["future_explicitly_published_offer_projection"],
    private: ["draft", "contact", "negotiation"],
    serverOnly: ["moderation", "abuse_signals"],
  },
  need: {
    public: ["public_summary", "need_type", "eligible_status", "due_at_when_safe"],
    private: ["responsible_internal", "internal_notes"],
    serverOnly: ["verification_and_workflow"],
  },
  interest: {
    public: [],
    private: ["public_alias", "contact_private", "offer_private", "consent_to_contact"],
    serverOnly: ["status", "created_at", "connection_workflow"],
  },
  territory: {
    public: ["safe_public_location_projection"],
    private: ["private_location"],
    serverOnly: ["responsible_internal"],
  },
  exchange: {
    public: [],
    private: ["participants", "contact", "terms", "messages"],
    serverOnly: ["consent", "moderation", "audit"],
  },
} as const;

export const solidarityEconomyProjectionAudit = {
  parentTerritoryGateExplicit: true,
  organizationChildStatusGateExplicit: false,
  organizationChildVerificationGateExplicit: false,
  organizationPrivateContactSelected: false,
  publicContactAuthorizedDatabaseType: "text",
  publicContactIsAuthorizationBoolean: false,
  publicContactRule:
    "Somente um valor de contato deliberadamente gravado como público e autorizado pode ser projetado; nunca derivar de private_contact.",
  decision: "BLOCK_PUBLIC_ECONOMIC_ADAPTER_UNTIL_CHILD_GATE_IS_EXPLICIT",
} as const;

export const canonicalEconomicCardinalities = {
  organizationToTerritory: {
    current: "exactly_one_via_shared_primary_key",
    desired: "one_identity_with_zero_to_many_explicit_territorial_contexts",
    supportedNow: false,
  },
  organizationToOffers: {
    current: "unsupported",
    desired: "one_to_many",
    supportedNow: false,
  },
  organizationToNeeds: {
    current: "one_to_many_optional_via_organization_territory_id",
    desired: "one_to_many_optional",
    supportedNow: true,
  },
  needToInterests: {
    current: "one_to_many_private",
    desired: "one_to_many_private_consent_based",
    supportedNow: true,
  },
  offerToInterestsOrExchanges: {
    current: "unsupported",
    desired: "one_to_many_private_consent_based",
    supportedNow: false,
  },
  organizationToCommunities: {
    current: "unsupported",
    desired: "optional_many_to_many_only_if_product_need_is_proven",
    supportedNow: false,
  },
  organizationToPautas: {
    current: "unsupported_directly",
    desired: "optional_many_to_many_explicit",
    supportedNow: false,
  },
  organizationToActions: {
    current: "unsupported_directly",
    desired: "optional_many_to_many_explicit",
    supportedNow: false,
  },
} as const;

export const solidarityEconomyGovernanceDecision = {
  currentCreateAndEdit: "admin_or_editor_server_side",
  futureCreate:
    "low_friction_claim_or_submission_saved_private_or_pending_before_publication",
  futureEdit:
    "authorized_organization_steward_with_server_side_moderation_and_correction_history",
  organizationType:
    "self_declared_candidate_separate_from_verification_status_until_reviewed",
  corrections: "moderated_territorial_contribution_or_explicit_steward_flow",
  automaticPublicationAllowed: false,
  verificationIsRanking: false,
} as const;

export const solidarityEconomyAbuseBoundary = {
  risks: [
    "spam",
    "fraud",
    "scam",
    "abusive_contact",
    "illegal_item",
    "generic_commercial_advertising",
    "stale_information",
    "false_cooperative_identity",
    "doxxing",
  ],
  ratingsForbiddenFirstCycle: true,
  broadListingsRequireCategoryAndModerationPolicy: true,
  newModerationEngineInA0: false,
} as const;

export const a0SolidarityEconomyArchitectureDecision = {
  economicSurface: "RECOMPOSE_EXISTING_COOPERATIVAS_ROUTE_AS_DISCOVERY_SURFACE",
  organization: "REUSE_WITH_EXTENSION",
  offer: "NEEDS_NEW_CANONICAL_OBJECT",
  need: "REUSE_WITH_EXTENSION",
  interest: "REUSE_CANONICAL_FOR_NEEDS_ONLY",
  exchange: "DEFERRED_UNTIL_EXPLICIT_CONSENT_FLOW",
  territory: "REUSE_CANONICAL_AS_OPTIONAL_CONTEXT",
  communities: "OPTIONAL_CONTEXT_NO_CURRENT_RELATION",
  pautas: "OPTIONAL_EXPLICIT_RELATION_NO_AUTO_CREATE",
  actions: "NEW_LINKS_PREFER_COLLECTIVE_ACTIONS_LEGACY_KEEP_COMPAT",
  recycling: "SPECIALIZED_DOMAIN_NOT_GENERIC_PRODUCT_MODEL",
  individualProducers:
    "DEFERRED_FIRST_CYCLE_BUT_FUTURE_ADMISSION_MUST_REMAIN_POSSIBLE",
  publicExperienceName: "Feirinha",
  publicExperienceContext: "Trocas e economia solidária",
  primaryExperienceEntry: "Participar",
  secondaryExperienceEntry: "Explorar_territorio_communities",
  payments: "DEFERRED",
  orders: "DEFERRED",
  ratings: "FORBIDDEN_FIRST_CYCLE",
  newMarketplaceRoot: false,
  feirinhaIsEntity: false,
  businessWriteInA0: false,
  nextSlice: "48.4-A1",
} as const;

export const futureMinimumSolidarityEconomyFlow = [
  "Participar",
  "Economia solidaria",
  "Encontrar organizacao oferta ou necessidade",
  "Abrir",
  "Manifestar interesse",
  "Contato consentido",
  "Continuar em Minha participacao",
] as const;

export function getSolidarityEconomyStructureDecision(structure: string) {
  return (
    solidarityEconomyStructureDecisions.find(
      (item) => item.structure === structure,
    ) ?? null
  );
}

