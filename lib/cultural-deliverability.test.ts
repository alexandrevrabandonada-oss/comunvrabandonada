import { describe, expect, it } from "vitest";
import {
  classifyArchiveRadioArtDeliverability,
  culturalExperienceDefinitionSchema,
  culturalExperienceDefinitions,
  culturalPublicationBlockers,
} from "./cultural-deliverability";

const complete = {
  experience: "territorial_art" as const,
  title: true,
  context: true,
  source: true,
  credits: true,
  rightsApproved: true,
  privateOriginal: true,
  publicDerivative: true,
  publicDerivativeObjectVerified: true,
  accessibility: true,
  territoryOrPauta: true,
  editorialStateApproved: true,
  nextActionDefined: true,
  withdrawalDefined: true,
  retentionDefined: true,
  auditRecorded: true,
  publicProjectionSanitized: true,
  originalExposed: false,
};

const realContent = {
  archive: {
    candidatePresent: true,
    rightsEvidenceComplete: true,
    editorialAuthorizationRecorded: true,
    publicSmokeGreen: true,
  },
  community_radio: {
    candidatePresent: true,
    rightsEvidenceComplete: true,
    editorialAuthorizationRecorded: true,
    publicSmokeGreen: true,
  },
  territorial_art: {
    candidatePresent: true,
    rightsEvidenceComplete: true,
    editorialAuthorizationRecorded: true,
    publicSmokeGreen: true,
  },
};

describe("contrato cultural comum", () => {
  it("mantém Acervo, Rádio e Arte na raiz canônica", () => {
    expect(
      Object.values(culturalExperienceDefinitions).map(
        (definition) => definition.canonicalRoot,
      ),
    ).toEqual([
      "comun_archive_items",
      "comun_archive_items",
      "comun_archive_items",
    ]);
  });

  it("rejeita campo privado na projeção pública", () => {
    const invalid = {
      ...culturalExperienceDefinitions.archive,
      publicProjection: ["title", "summary", "object_key"],
    };
    expect(culturalExperienceDefinitionSchema.safeParse(invalid).success).toBe(
      false,
    );
  });

  it("aceita publicação com proveniência, direitos e acessibilidade", () => {
    expect(culturalPublicationBlockers(complete)).toEqual([]);
  });

  it("bloqueia original público, derivada sem objeto e falta de contexto", () => {
    expect(
      culturalPublicationBlockers({
        ...complete,
        territoryOrPauta: false,
        publicDerivativeObjectVerified: false,
        originalExposed: true,
      }),
    ).toEqual([
      "public_derivative_object",
      "territory_or_pauta",
      "private_original_exposed",
    ]);
  });

  it("não promove sem ensaio privado completo", () => {
    expect(
      classifyArchiveRadioArtDeliverability({
        contractGreen: true,
        schemaGreen: true,
        rlsGreen: true,
        storageGreen: true,
        privateRehearsalGreen: false,
        publicNoLeakGreen: true,
        realContent,
      }),
    ).toBe("COMUN_ARCHIVE_RADIO_ART_BLOCKED_TECHNICAL_EVIDENCE");
  });

  it("fica pronto para conteúdo real quando a técnica está verde", () => {
    expect(
      classifyArchiveRadioArtDeliverability({
        contractGreen: true,
        schemaGreen: true,
        rlsGreen: true,
        storageGreen: true,
        privateRehearsalGreen: true,
        publicNoLeakGreen: true,
        realContent: {
          ...realContent,
          community_radio: {
            ...realContent.community_radio,
            editorialAuthorizationRecorded: false,
          },
        },
      }),
    ).toBe("COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL");
  });

  it("só fica verde com conteúdo real autorizado nos três recortes", () => {
    expect(
      classifyArchiveRadioArtDeliverability({
        contractGreen: true,
        schemaGreen: true,
        rlsGreen: true,
        storageGreen: true,
        privateRehearsalGreen: true,
        publicNoLeakGreen: true,
        realContent,
      }),
    ).toBe("COMUN_ARCHIVE_RADIO_ART_GREEN");
  });
});
