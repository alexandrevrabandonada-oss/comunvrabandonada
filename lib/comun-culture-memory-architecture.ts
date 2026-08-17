export const COMUN_CULTURE_MEMORY_ARCHITECTURE_VERSION =
  "comun-culture-memory-architecture-v1" as const;

export const cultureReconciliationDecisions = [
  "REUSE_CANONICAL",
  "REUSE_WITH_EXTENSION",
  "DERIVED_LAYER",
  "SPECIALIZED_DOMAIN",
  "LEGACY_KEEP_COMPAT",
  "DEPRECATE_CONCEPTUALLY",
  "UNRELATED",
] as const;

export type CultureReconciliationDecision =
  (typeof cultureReconciliationDecisions)[number];

export type CultureStructureDecision = {
  readonly structure: string;
  readonly domain: string;
  readonly currentRole: string;
  readonly runtimeUsage: string;
  readonly durability: "durable" | "operational" | "derived";
  readonly publicPrivate: string;
  readonly rightsBoundary: string;
  readonly storageBoundary: string;
  readonly writePath: string;
  readonly reviewPath: string;
  readonly rls: string;
  readonly dependencies: readonly string[];
  readonly decision: CultureReconciliationDecision;
  readonly futureRole: string;
  readonly migrationNeeded: boolean;
  readonly risk: string;
};

export const canonicalCultureGrammar = {
  artifact:
    "Objeto durável de memória ou cultura, distinto de sua mídia e de sua apresentação editorial.",
  collection:
    "Agrupamento curatorial de artefatos; não duplica nem possui o item.",
  creator:
    "Identidade cultural e atribuição; não é conta, papel de autenticação, organização ou comunidade.",
  source: "Proveniência do item, distinta da descrição editorial.",
  rights:
    "Permissão de exibição e condições autorais versionáveis; acesso técnico ao arquivo não concede direito.",
  consent:
    "Autorização específica por pessoa, finalidade, mídia, versão e período, com retirada preservada.",
  identificationClaim:
    "Proposta humana revisável sobre uma imagem ou memória; não é verdade automática.",
  oralHistory:
    "Especialização sensível com material bruto privado e projeções públicas consentidas.",
  artwork: "Especialização territorial de um artefato do Acervo.",
  musicRecord:
    "Especialização de catálogo musical; catalogar obra não autoriza disponibilizar fonograma.",
  radioProgram:
    "Identidade editorial durável da Rádio, ancorada em item do Acervo.",
  radioEpisode:
    "Unidade editorial temporal e artefato cultural, ancorada em item do Acervo com gates próprios.",
  radioSchedule:
    "Organização temporal; não é artefato nem evidência de transmissão ao vivo.",
  curation:
    "Organização e narrativa editorial, distinta de moderação, direitos e consentimento.",
} as const;

export const cultureStructureDecisions = [
  {
    structure: "comun_archive_items + comun_archive_assets",
    domain: "archive",
    currentRole:
      "Raiz compartilhada de identidade, metadados, direitos básicos e assets para fotografia, documento, artista, música, história oral, arte territorial e rádio.",
    runtimeUsage:
      "Readers server-side do Acervo e especializações filtram a raiz e anexos public_safe.",
    durability: "durable",
    publicPrivate:
      "Item exige published/public/published_at; asset exige public_safe/approved/public_url.",
    rightsBoundary:
      "rights_status do item e do asset são gates mínimos, não substituem gates especializados.",
    storageBoundary:
      "private_original e public_safe são escopos distintos; object_key é operacional.",
    writePath:
      "service-role por ações administrativas e fluxos especializados.",
    reviewPath: "review/approved/published mais revisão específica do domínio.",
    rls: "RLS habilitado; SELECT público limitado por policies; CRUD service_role.",
    dependencies: [],
    decision: "REUSE_WITH_EXTENSION",
    futureRole:
      "Substrato canônico de memória cultural; extensões futuras devem preservar especializações e direitos.",
    migrationNeeded: false,
    risk: "O gate genérico isolado é insuficiente para voz, imagem, música e terceiros.",
  },
  {
    structure: "comun_archive_collections + comun_archive_collection_items",
    domain: "archive",
    currentRole: "Curadoria N:N de itens, com ordem e nota editorial.",
    runtimeUsage: "Listas e páginas públicas do Acervo.",
    durability: "durable",
    publicPrivate: "Coleção e filhos precisam estar publicados.",
    rightsBoundary: "A coleção não amplia direitos dos itens.",
    storageBoundary: "Somente referência opcional a cover asset.",
    writePath: "service-role/admin.",
    reviewPath: "draft/review/approved/published.",
    rls: "RLS habilitado; SELECT público com child gate.",
    dependencies: ["comun_archive_items", "comun_archive_assets"],
    decision: "REUSE_CANONICAL",
    futureRole: "Coleção curatorial canônica, nunca cópia de artefato.",
    migrationNeeded: false,
    risk: "Publicar capa ou filho sem repetir o gate de direitos do artefato.",
  },
  {
    structure:
      "comun_archive_submissions + submission_assets + item_suggestions + rights_removal_requests",
    domain: "historical_photo",
    currentRole:
      "Entrada privada, pesquisa, direitos, sugestões e retirada de fotografia histórica.",
    runtimeUsage:
      "Formulários públicos via ações server-side e filas admin; não é projeção pública.",
    durability: "operational",
    publicPrivate:
      "Contatos, declaração, história da fonte e moderação permanecem privados.",
    rightsBoundary:
      "permission_confirmed inicia revisão; não auto-publica nem concede reutilização.",
    storageBoundary:
      "Original entra privado e derivada pública é criada/revisada separadamente.",
    writePath: "Ações server-side e service-role.",
    reviewPath: "submitted→triage→research→rights_review→editorial.",
    rls: "RLS habilitado; sem grant de cliente; service_role CRUD.",
    dependencies: ["comun_archive_items", "comun_archive_assets"],
    decision: "REUSE_WITH_EXTENSION",
    futureRole:
      "Pipeline canônico de fotografia, com claims de identificação versionadas.",
    migrationNeeded: false,
    risk: "Suggestion aprovada pode sobrescrever interpretação sem modelo completo de proveniência/confiança.",
  },
  {
    structure: "comun_archive_identification_*",
    domain: "identification",
    currentRole:
      "Campanha sanitizada, itens, contribuições, denúncias, sínteses e log editorial para identificação humana.",
    runtimeUsage: "Rota /acervo/identificar e operação admin.",
    durability: "operational",
    publicPrivate:
      "Projeção pública sanitizada separada do texto bruto e detalhes de moderação.",
    rightsBoundary: "Identificação não altera direitos do asset.",
    storageBoundary: "Referencia item/derivada; não cria mídia canônica.",
    writePath: "Ações server-side; publicação após revisão.",
    reviewPath: "Claim humana moderada com summary editorial.",
    rls: "RLS habilitado; clientes fechados; service_role CRUD.",
    dependencies: ["comun_archive_items", "comun_archive_item_suggestions"],
    decision: "REUSE_WITH_EXTENSION",
    futureRole:
      "Claim de identificação revisável; A1 deve explicitar fonte, confiança e histórico antes de tratá-la como fato.",
    migrationNeeded: false,
    risk: "Não há contrato único que prove datação/identidade com epistemologia uniforme.",
  },
  {
    structure:
      "comun_archive_artworks + agents + credits + artwork_rights + safety_reviews",
    domain: "art",
    currentRole:
      "Especialização 1:1 de item territorial_artwork com criadores, créditos, território, direitos e segurança.",
    runtimeUsage:
      "Ambas /comun/arte e /comun/acervo/arte consomem o mesmo helper/schema.",
    durability: "durable",
    publicPrivate:
      "Item raiz publicado, asset seguro e campos públicos; contato, auth, local preciso e notas ficam privados.",
    rightsBoundary:
      "Exibição, download, social, impressão e usos são permissões separadas.",
    storageBoundary: "artwork-private-originals e artwork-public-derivatives.",
    writePath: "Contribuição server-side e operação admin.",
    reviewPath: "Direitos, safety quando necessário e publicação editorial.",
    rls: "RLS habilitado; tabelas especializadas fechadas a clientes.",
    dependencies: [
      "comun_archive_items",
      "comun_archive_assets",
      "comun_hub_territories",
    ],
    decision: "SPECIALIZED_DOMAIN",
    futureRole:
      "Especialização legítima do Acervo; /comun/acervo/arte é a superfície canônica e /comun/arte fica compatibilidade até merge futuro.",
    migrationNeeded: false,
    risk: "Reader público seleciona rights sem exigir consent_status/allow_display no banco; registrar fail-closed gap.",
  },
  {
    structure:
      "comun_archive_artist_profiles + music_releases + music_tracks + external_links + music_rights_reviews",
    domain: "music",
    currentRole:
      "Catálogo local de artistas, lançamentos, faixas e links externos revisados.",
    runtimeUsage:
      "Rotas /acervo/artistas e /acervo/musica; áudio integral não é requisito.",
    durability: "durable",
    publicPrivate:
      "Raiz publicada e allowlist explícita de campos; contatos/reviews privados excluídos.",
    rightsBoundary:
      "Composição, fonograma, capa e link externo têm permissões distintas.",
    storageBoundary:
      "Assets do Acervo quando autorizados; links externos podem substituir hospedagem.",
    writePath: "service-role/admin e submissions/claims especializadas.",
    reviewPath: "curadoria, rights review e link checks.",
    rls: "RLS habilitado; tabelas filhas fechadas a clientes.",
    dependencies: ["comun_archive_items", "comun_archive_assets"],
    decision: "SPECIALIZED_DOMAIN",
    futureRole:
      "Especialização de catálogo/memória musical; nunca plataforma de streaming/ranking.",
    migrationNeeded: false,
    risk: "Algumas consultas de facets leem todas as linhas filhas via service-role sem repetir gate do pai; não publicar esses dados sem reconciliação.",
  },
  {
    structure:
      "comun_archive_oral_histories + participants + consents + transcript_versions + segments + participant_approvals",
    domain: "oral_history",
    currentRole:
      "Entrevista, participantes, consentimento versionado, material privado, transcrições, segmentos públicos e retirada.",
    runtimeUsage:
      "Reader público aplica item, publicação, embargo, consent publication_final, transcript e audio gates.",
    durability: "durable",
    publicPrivate:
      "Bruto, planos, riscos e terceiros são server-only; somente derivadas aprovadas e consentidas são públicas.",
    rightsBoundary:
      "Consentimentos granularizam preservação, transcrição, áudio, imagem, nome, download e validade.",
    storageBoundary:
      "Original privado, derivada pública e custody events separados.",
    writePath: "service-role/admin; sugestão pública salva privada.",
    reviewPath: "legal consent, safety, participant approval e editorial.",
    rls: "RLS habilitado; clientes fechados.",
    dependencies: [
      "comun_archive_items",
      "comun_archive_assets",
      "comun_archive_consent_templates",
    ],
    decision: "SPECIALIZED_DOMAIN",
    futureRole:
      "Boundary sensível própria sobre o Acervo; nunca reduzir a status=published.",
    migrationNeeded: false,
    risk: "Identificação de terceiros e retiradas exigem operação contínua e versionamento preservado.",
  },
  {
    structure: "comun_radio_programs + episodes + schedule_entries",
    domain: "radio",
    currentRole:
      "Programa durável, episódio temporal e grade, todos com programa/episódio ancorados em archive_item_id.",
    runtimeUsage: "Superfície /comun/radio, páginas focais e grade.",
    durability: "durable",
    publicPrivate:
      "publication_status publicado e relações públicas; contribuições e operação privadas.",
    rightsBoundary:
      "Voz, música, transcript, safety e asset público são gates independentes.",
    storageBoundary:
      "radio-private-originals e radio-public-audio com perfil MIME/tamanho versionado.",
    writePath: "service-role/admin; contribuição pública via server action.",
    reviewPath: "rights_review, editorial_review e publicação.",
    rls: "RLS habilitado; clientes fechados; service_role.",
    dependencies: [
      "comun_archive_items",
      "comun_archive_assets",
      "comun_pauta_spaces",
      "comun_hub_territories",
    ],
    decision: "SPECIALIZED_DOMAIN",
    futureRole:
      "Superfície editorial cultural canônica; programa/episódio preservam modelo próprio e identidade comum do Acervo.",
    migrationNeeded: false,
    risk: "Reader de listagem não revalida voice/music/safety/transcript gates; publication_status sozinho não prova publicabilidade.",
  },
  {
    structure: "comun_hub_archive_links",
    domain: "relations",
    currentRole:
      "Link explícito de archive item com pauta, projeto, ação legada, território, resultado ou material.",
    runtimeUsage: "Integração do hub; não é raiz do item.",
    durability: "durable",
    publicPrivate:
      "Visibilidade pública depende de ambos os lados e não pode ser inferida por label.",
    rightsBoundary: "Relação não amplia permissão do item.",
    storageBoundary: "Sem asset próprio.",
    writePath: "service-role/admin.",
    reviewPath: "Curadoria explícita.",
    rls: "RLS habilitado; clientes fechados.",
    dependencies: [
      "comun_archive_items",
      "comun_pauta_spaces",
      "comun_mobilization_actions",
      "comun_hub_territories",
    ],
    decision: "LEGACY_KEEP_COMPAT",
    futureRole:
      "Compatibilidade de relações; novos vínculos com Pauta/Ação canônicas precisam de contrato explícito, sem auto-link.",
    migrationNeeded: false,
    risk: "action_id aponta para raiz de mobilização legada, não para comun_collective_actions.",
  },
  {
    structure: "comun_search_documents",
    domain: "search",
    currentRole:
      "Índice público reconstruível que inclui projeções culturais allowlisted.",
    runtimeUsage: "Civic Search server-side.",
    durability: "derived",
    publicPrivate:
      "Somente public_text e rotas já públicas; originais, contatos, consentimentos e notas são proibidos.",
    rightsBoundary: "Busca não concede nem decide direitos.",
    storageBoundary: "Sem mídia; apenas referência pública.",
    writePath: "sync/embedding controlado por service-role.",
    reviewPath: "Deriva de projeção pública já aprovada.",
    rls: "RLS habilitado e funções service-role-only.",
    dependencies: ["public projections"],
    decision: "DERIVED_LAYER",
    futureRole:
      "Descoberta derivada, nunca source of truth nem auto-link semântico.",
    migrationNeeded: false,
    risk: "Indexar filhos sem repetir gates especializados pode vazar material sensível.",
  },
] as const satisfies readonly CultureStructureDecision[];

export const cultureSurfaceDecisions = {
  archive: "CANONICAL_MEMORY_SURFACE",
  archiveArt: "REUSE_CANONICAL_SURFACE",
  legacyArt: "COMPATIBILITY_ROUTE_MERGE_FUTURE",
  radio: "CANONICAL_EDITORIAL_SURFACE",
  music: "SPECIALIZED_CULTURAL_SURFACE",
  oralHistory: "SPECIALIZED_SENSITIVE_CULTURAL_SURFACE",
} as const;

export const cultureRightsConsentMatrix = {
  historical_photo: {
    copyright: "required_or_unknown_fail_closed",
    displayPermission: "required",
    reusePermission: "separate",
    voiceImageConsent: "subject_contextual",
    withdrawal: true,
    takedown: true,
    attribution: "explicit",
    anonymousOption: true,
    moderation: "LEGAL_RIGHTS_REQUIRED",
  },
  art: {
    copyright: "rights_holder_and_status",
    displayPermission: "allow_display",
    reusePermission: "per_use_flags",
    voiceImageConsent: "when_identifiable",
    withdrawal: true,
    takedown: true,
    attribution: "required_credit_public",
    anonymousOption: true,
    moderation: "LEGAL_RIGHTS_REQUIRED",
  },
  music: {
    copyright: "composition_and_recording_separate",
    displayPermission: "catalog_metadata",
    reusePermission: "phonogram_explicit",
    voiceImageConsent: "performer_contextual",
    withdrawal: true,
    takedown: true,
    attribution: "writers_and_performers",
    anonymousOption: false,
    moderation: "LEGAL_RIGHTS_REQUIRED",
  },
  oral_history: {
    copyright: "recording_and_text",
    displayPermission: "publication_final",
    reusePermission: "per_medium",
    voiceImageConsent: "granular_versioned",
    withdrawal: true,
    takedown: true,
    attribution: "public_name_or_anonymous",
    anonymousOption: true,
    moderation: "CONSENT_REQUIRED_SAFETY_REQUIRED",
  },
  radio_episode: {
    copyright: "episode_plus_music_uses",
    displayPermission: "voice_and_audio",
    reusePermission: "download_clips_campaign_separate",
    voiceImageConsent: "granular",
    withdrawal: true,
    takedown: true,
    attribution: "public_credits",
    anonymousOption: true,
    moderation: "LEGAL_RIGHTS_REQUIRED_CONSENT_REQUIRED",
  },
  academic_document: {
    copyright: "bibliographic_metadata_separate_from_file",
    displayPermission: "metadata_normally_public",
    reusePermission: "full_text_only_if_license_allows",
    voiceImageConsent: "not_normally_applicable",
    withdrawal: true,
    takedown: true,
    attribution: "bibliographic",
    anonymousOption: false,
    moderation: "LEGAL_RIGHTS_REQUIRED_FOR_HOSTED_FILE",
  },
} as const;

export const cultureHumanGateClasses = [
  "LEGAL_RIGHTS_REQUIRED",
  "CONSENT_REQUIRED",
  "SAFETY_REQUIRED",
  "EDITORIAL_REQUIRED",
  "QUALITY_OPTIONAL",
  "LEGACY_FRICTION",
] as const;

export const cultureArchitectureDecision = {
  memoryRoot: "COMUN_ARCHIVE_ITEMS_REUSE_WITH_EXTENSION",
  archiveItem: "CANONICAL_DURABLE_ARTIFACT",
  collection: "CANONICAL_CURATORIAL_GROUPING",
  art: "SPECIALIZED_DOMAIN_ON_ARCHIVE_ITEM",
  creator: "CULTURAL_IDENTITY_NOT_AUTH_ROLE",
  historicalPhoto: "SPECIALIZED_SUBMISSION_AND_PROCESSING_PIPELINE",
  identificationClaim: "REUSE_WITH_EXTENSION_REVISABLE_CLAIM",
  oralHistory: "SPECIALIZED_SENSITIVE_DOMAIN_ON_ARCHIVE_ITEM",
  music: "SPECIALIZED_CATALOG_DOMAIN_ON_ARCHIVE_ITEM",
  radioProgram: "SPECIALIZED_EDITORIAL_IDENTITY_ON_ARCHIVE_ITEM",
  radioEpisode: "SPECIALIZED_TEMPORAL_ARTIFACT_ON_ARCHIVE_ITEM",
  radioSchedule: "EDITORIAL_TEMPORAL_ORGANIZATION_NOT_ARTIFACT",
  academicResearch: "REUSE_EXISTING_ITEM_TYPE_WITH_EXTENSION",
  rights: "FIRST_CLASS_PER_DOMAIN_FAIL_CLOSED",
  consent: "VERSIONED_PURPOSE_AND_MEDIA_SPECIFIC",
  storage: "SEPARATE_PRIVATE_ORIGINAL_AND_PUBLIC_DERIVATIVE",
  search: "DERIVED_LAYER",
  pautaMemory: "SEPARATE_EXPLICIT_LINK_ONLY",
  territory: "OPTIONAL_EXPLICIT_CONTEXT",
  community: "OPTIONAL_EXPLICIT_CONTEXT",
  action: "OPTIONAL_EXPLICIT_CONTEXT",
  noAutomaticPublication: true,
  noAiAutoLink: true,
  noNewRoot: true,
  migrationPlan: [] as readonly string[],
  businessWriteInA0: false,
  nextSlice: "48.5-A1_ACERVO_VIVO_PUBLIC_MEMORY_CORE",
} as const;

export const culturePublicProjectionGaps = [
  "ART_CHILD_RIGHTS_GATE_NOT_ENFORCED_IN_PUBLIC_READER",
  "RADIO_EPISODE_CHILD_CONSENT_RIGHTS_SAFETY_GATES_NOT_ENFORCED_IN_LIST_READER",
  "MUSIC_FACETS_QUERY_NOT_SCOPED_TO_PUBLIC_PARENT",
  "IDENTIFICATION_CONFIDENCE_PROVENANCE_CONTRACT_INCOMPLETE",
  "ACADEMIC_BIBLIOGRAPHIC_SPECIALIZATION_INCOMPLETE",
] as const;

export const culturePrivacyBoundary = {
  public: [
    "published_metadata",
    "approved_public_derivatives",
    "authorized_attribution",
    "public_transcript_or_excerpt",
  ],
  private: [
    "original_media",
    "contact",
    "consent_evidence",
    "raw_transcript",
    "third_party_claims",
    "precise_location",
  ],
  serverOnly: [
    "object_key",
    "review_notes",
    "legal_evidence",
    "moderation",
    "processing_jobs",
    "custody_events",
  ],
} as const;

export function getCultureStructureDecision(structure: string) {
  return (
    cultureStructureDecisions.find((entry) => entry.structure === structure) ??
    null
  );
}
