import { describe, expect, it } from "vitest";
import {
  defineMiniapp,
  miniappDeepLink,
  miniappDefinitionSchema,
} from "./miniapp-contract";
import { pautaModuleRegistry } from "./comun/pauta-module-registry";
import { COMUN_V1_LAUNCH_PROGRAM } from "./comun-launch-program";
import { sidewalkMiniappDefinition } from "./sidewalk-miniapp-definition";

const syntheticDefinition = {
  schemaVersion: 1 as const,
  id: "agenda-cultural-local",
  slug: "agenda-cultural",
  title: "Agenda cultural comunitária",
  summary:
    "Fixture local que comprova o contrato sem criar uma superfície pública.",
  canonicalModuleType: "calendar" as const,
  routes: {
    home: "/comun/fixtures/agenda-cultural",
    contribution: "/comun/fixtures/agenda-cultural/contribuir",
    textAlternative: "/comun/fixtures/agenda-cultural/lista",
    participation: "/comun/minha-participacao",
    inbox: "/comun/inbox",
    administration: "/comun/admin/fixtures/agenda-cultural",
  },
  context: {
    pautaSlug: "cultura-no-territorio",
    communitySource: "canonical_pauta" as const,
    territory: {
      slug: "volta-redonda",
      label: "Volta Redonda",
      coverageLabel: "Agenda colaborativa em teste local",
    },
  },
  primaryAction: {
    label: "Sugerir atividade",
    route: "/comun/fixtures/agenda-cultural/contribuir",
  },
  contribution: {
    mode: "authenticated" as const,
    states: ["draft", "under_review", "published"],
  },
  moderationStates: ["pending", "approved", "rejected"],
  followUpStates: ["under_review", "published", "archived"],
  permissions: {
    contribute: ["member"],
    moderate: ["editor"],
    operate: ["admin"],
  },
  publicProjection: ["title", "public_summary", "starts_at"],
  politicalLinks: {
    collectiveAction: false,
    protocol: false,
    result: true,
    memory: true,
  },
  inboxEvents: ["information_requested", "published"],
  auditEvents: ["contribution_submitted", "moderation_decided"],
  privacy: {
    privateFields: ["contact_private"],
    retentionPolicy: "Fixture sem persistência.",
  },
  capabilities: ["moderation", "public_result", "collective_memory"] as const,
};

describe("miniapp experience contract", () => {
  it("valida a definição real e sua registry canônica", () => {
    expect(sidewalkMiniappDefinition.canonicalModuleType).toBe("map");
    expect(
      pautaModuleRegistry[sidewalkMiniappDefinition.canonicalModuleType],
    ).toBeDefined();
  });

  it("aceita fixture local desacoplada e capacidades opcionais", () => {
    const definition = defineMiniapp(syntheticDefinition as never);
    expect(definition.capabilities).not.toContain("map");
    expect(JSON.stringify(definition)).not.toContain("calcad");
  });

  it("rejeita contexto incompleto e rota fora do COMUN", () => {
    const invalid = {
      ...syntheticDefinition,
      routes: { ...syntheticDefinition.routes, home: "https://example.com" },
      context: { pautaSlug: "cultura-no-territorio" },
    };
    expect(miniappDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it("produz deep link estável e alternativa textual própria", () => {
    expect(miniappDeepLink(sidewalkMiniappDefinition, "participation")).toBe(
      "/comun/minha-participacao",
    );
    expect(sidewalkMiniappDefinition.routes.textAlternative).not.toBe(
      sidewalkMiniappDefinition.routes.home,
    );
  });

  it("rejeita campo privado na projeção pública", () => {
    const invalid = {
      ...syntheticDefinition,
      publicProjection: ["title", "member_user_id"],
    };
    expect(miniappDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it("não promove miniapps nem aciona o gate terminal durante o piloto", () => {
    expect(
      COMUN_V1_LAUNCH_PROGRAM.domains.find((domain) => domain.id === "miniapps")
        ?.status,
    ).toBe("in_progress");
    expect(COMUN_V1_LAUNCH_PROGRAM.finalHumanGate).toBe("launch_publicly");
  });
});
