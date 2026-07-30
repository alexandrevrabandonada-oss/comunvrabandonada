import { z } from "zod";

export const culturalExperienceIds = [
  "archive",
  "community_radio",
  "territorial_art",
] as const;

export type CulturalExperienceId = (typeof culturalExperienceIds)[number];

const publicFieldSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9_]*$/);

const forbiddenPublicFields = new Set([
  "contact_private",
  "creation_place_private",
  "member_user_id",
  "object_key",
  "original_filename",
  "private_contact",
  "private_notes",
  "raw_text",
  "signed_url",
]);

export const culturalExperienceDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.enum(culturalExperienceIds),
    canonicalRoot: z.literal("comun_archive_items"),
    specialization: z.string().trim().min(3),
    publicRoute: z.string().regex(/^\/comun(?:\/|$)/),
    administrationRoute: z.string().regex(/^\/comun\/admin(?:\/|$)/),
    contributionRoute: z.string().regex(/^\/comun(?:\/|$)/),
    publicProjection: z.array(publicFieldSchema).min(3),
    requiresPrivateOriginal: z.boolean(),
    requiresPublicDerivative: z.boolean(),
    accessibilityEvidence: z.enum([
      "alt_text",
      "transcript_or_documented_exception",
    ]),
    politicalContext: z.enum(["territory_or_pauta", "source_context"]),
    withdrawalRoute: z.string().regex(/^\/comun(?:\/|$)/),
    retentionPolicy: z.string().trim().min(10).max(300),
  })
  .strict()
  .superRefine((definition, context) => {
    for (const field of definition.publicProjection) {
      if (forbiddenPublicFields.has(field)) {
        context.addIssue({
          code: "custom",
          path: ["publicProjection"],
          message: "A projeção cultural pública contém campo privado.",
        });
      }
    }
  });

export type CulturalExperienceDefinition = z.infer<
  typeof culturalExperienceDefinitionSchema
>;

function defineCulturalExperience(
  definition: CulturalExperienceDefinition,
): CulturalExperienceDefinition {
  return Object.freeze(culturalExperienceDefinitionSchema.parse(definition));
}

export const culturalExperienceDefinitions = Object.freeze({
  archive: defineCulturalExperience({
    schemaVersion: 1,
    id: "archive",
    canonicalRoot: "comun_archive_items",
    specialization: "archive_editorial_metadata",
    publicRoute: "/comun/acervo",
    administrationRoute: "/comun/admin/acervo",
    contributionRoute: "/comun/acervo/contribuir",
    publicProjection: [
      "slug",
      "item_type",
      "title",
      "summary",
      "source_name",
      "credits",
      "rights_status",
      "published_at",
    ],
    requiresPrivateOriginal: true,
    requiresPublicDerivative: true,
    accessibilityEvidence: "alt_text",
    politicalContext: "source_context",
    withdrawalRoute: "/comun/acervo/direitos-e-remocao",
    retentionPolicy:
      "O original permanece privado; retirada e correção preservam auditoria sanitizada.",
  }),
  community_radio: defineCulturalExperience({
    schemaVersion: 1,
    id: "community_radio",
    canonicalRoot: "comun_archive_items",
    specialization: "comun_radio_episodes",
    publicRoute: "/comun/radio",
    administrationRoute: "/comun/admin/radio",
    contributionRoute: "/comun/radio/contribuir",
    publicProjection: [
      "slug_public",
      "title_public",
      "summary_public",
      "duration_seconds",
      "transcript_status",
      "published_at",
    ],
    requiresPrivateOriginal: true,
    requiresPublicDerivative: true,
    accessibilityEvidence: "transcript_or_documented_exception",
    politicalContext: "territory_or_pauta",
    withdrawalRoute: "/comun/radio/direitos-e-consentimento",
    retentionPolicy:
      "Áudio original e consentimentos permanecem privados; retirada cancela agenda pública.",
  }),
  territorial_art: defineCulturalExperience({
    schemaVersion: 1,
    id: "territorial_art",
    canonicalRoot: "comun_archive_items",
    specialization: "comun_archive_artworks",
    publicRoute: "/comun/acervo/arte",
    administrationRoute: "/comun/admin/acervo/arte",
    contributionRoute: "/comun/acervo/arte/contribuir",
    publicProjection: [
      "slug",
      "title_public",
      "description_public",
      "context_public",
      "public_credit",
      "license_public",
      "published_at",
    ],
    requiresPrivateOriginal: true,
    requiresPublicDerivative: true,
    accessibilityEvidence: "alt_text",
    politicalContext: "territory_or_pauta",
    withdrawalRoute: "/comun/acervo/arte/direitos-e-retirada",
    retentionPolicy:
      "Original, contato e localização sensível permanecem privados; derivadas podem ser retiradas.",
  }),
} satisfies Record<CulturalExperienceId, CulturalExperienceDefinition>);

export type CulturalPublicationEvidence = {
  experience: CulturalExperienceId;
  title: boolean;
  context: boolean;
  source: boolean;
  credits: boolean;
  rightsApproved: boolean;
  privateOriginal: boolean;
  publicDerivative: boolean;
  publicDerivativeObjectVerified: boolean;
  accessibility: boolean;
  territoryOrPauta: boolean;
  editorialStateApproved: boolean;
  nextActionDefined: boolean;
  withdrawalDefined: boolean;
  retentionDefined: boolean;
  auditRecorded: boolean;
  publicProjectionSanitized: boolean;
  originalExposed: boolean;
};

export function culturalPublicationBlockers(
  evidence: CulturalPublicationEvidence,
) {
  const blockers: string[] = [];
  for (const [key, present] of [
    ["title", evidence.title],
    ["context", evidence.context],
    ["source", evidence.source],
    ["credits", evidence.credits],
    ["rights", evidence.rightsApproved],
    ["private_original", evidence.privateOriginal],
    ["public_derivative", evidence.publicDerivative],
    ["public_derivative_object", evidence.publicDerivativeObjectVerified],
    ["accessibility", evidence.accessibility],
    ["editorial_state", evidence.editorialStateApproved],
    ["next_action", evidence.nextActionDefined],
    ["withdrawal", evidence.withdrawalDefined],
    ["retention", evidence.retentionDefined],
    ["audit", evidence.auditRecorded],
    ["public_projection", evidence.publicProjectionSanitized],
  ] as const) {
    if (!present) blockers.push(key);
  }
  if (
    culturalExperienceDefinitions[evidence.experience].politicalContext ===
      "territory_or_pauta" &&
    !evidence.territoryOrPauta
  ) {
    blockers.push("territory_or_pauta");
  }
  if (evidence.originalExposed) blockers.push("private_original_exposed");
  return blockers;
}

export type CulturalDeliverabilityEvidence = {
  contractGreen: boolean;
  schemaGreen: boolean;
  rlsGreen: boolean;
  storageGreen: boolean;
  privateRehearsalGreen: boolean;
  publicNoLeakGreen: boolean;
  realContent: Record<
    CulturalExperienceId,
    {
      candidatePresent: boolean;
      rightsEvidenceComplete: boolean;
      editorialAuthorizationRecorded: boolean;
      publicSmokeGreen: boolean;
    }
  >;
};

export function classifyArchiveRadioArtDeliverability(
  evidence: CulturalDeliverabilityEvidence,
) {
  const technical = [
    evidence.contractGreen,
    evidence.schemaGreen,
    evidence.rlsGreen,
    evidence.storageGreen,
    evidence.privateRehearsalGreen,
    evidence.publicNoLeakGreen,
  ];
  if (technical.some((value) => !value)) {
    return "COMUN_ARCHIVE_RADIO_ART_BLOCKED_TECHNICAL_EVIDENCE";
  }
  const content = Object.values(evidence.realContent);
  if (
    content.some(
      (item) =>
        !item.candidatePresent ||
        !item.rightsEvidenceComplete ||
        !item.editorialAuthorizationRecorded ||
        !item.publicSmokeGreen,
    )
  ) {
    return "COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL";
  }
  return "COMUN_ARCHIVE_RADIO_ART_GREEN";
}
