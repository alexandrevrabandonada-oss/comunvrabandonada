import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMUN_48_4_A7_TERMINAL,
  COMUN_48_4_FIRST_CYCLE_DECISION,
  COMUN_48_4_FIRST_CYCLE_DEFERRED,
  SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1,
  solidarityNeedStatusLabel,
  solidarityOfferStatusLabel,
} from "./comun-solidarity-economy-experience";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const directoryPage = read("app/comun/cooperativas/page.tsx");
const organizationPage = read("app/comun/cooperativas/[slug]/page.tsx");
const onboardingPage = read(
  "app/comun/cooperativas/nova/[onboardingToken]/page.tsx",
);
const participationPage = read("app/comun/minha-participacao/page.tsx");
const participatePage = read("app/comun/participar/page.tsx");

describe("COMUN 48.4-A7 integrated solidarity economy experience", () => {
  it("closes the first cycle without inventing A8 or a marketplace domain", () => {
    expect(COMUN_48_4_FIRST_CYCLE_DECISION).toBe("48.4_FIRST_CYCLE_CLOSED");
    expect(COMUN_48_4_A7_TERMINAL).toContain("FIRST_CYCLE_CLOSED");
    expect(COMUN_48_4_FIRST_CYCLE_DEFERRED.individualProducers).toContain(
      "DEFERRED",
    );
    expect(COMUN_48_4_FIRST_CYCLE_DEFERRED.payments).toBe("DEFERRED");
    expect(COMUN_48_4_FIRST_CYCLE_DEFERRED.orders).toBe("DEFERRED");
    expect(COMUN_48_4_FIRST_CYCLE_DEFERRED.ratings).toBe(
      "FORBIDDEN_FIRST_CYCLE",
    );
  });

  it("versions one exhaustive route and role matrix with predictable return paths", () => {
    expect(SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1).toHaveLength(8);
    const routes = SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1.map((row) => row.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toContain("/comun/cooperativas");
    expect(routes).toContain("/comun/cooperativas/[slug]");
    expect(routes).toContain(
      "/comun/minha-participacao?secao=acompanhando",
    );
    for (const row of SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1) {
      expect(row.flagOn).toBe("canonical");
      expect(row.primaryAction.length).toBeGreaterThan(3);
      expect(row.returnPath.startsWith("/comun")).toBe(true);
    }
  });

  it("keeps editor and facilitator equal for content but facilitator-only for governance", () => {
    const offer = SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1.find((row) =>
      row.route.includes("/ofertas/"),
    );
    const organization = SOLIDARITY_ECONOMY_ROUTE_MATRIX_V1.find(
      (row) => row.route === "/comun/cooperativas/[slug]",
    );
    expect(offer?.editor).toBe("organization_maintenance");
    expect(offer?.facilitator).toBe("organization_maintenance");
    expect(organization?.editor).toBe("organization_maintenance");
    expect(organization?.facilitator).toBe("organization_governance");
    expect(organization?.pending).toBe("pending_read_only");
  });

  it("uses human lifecycle labels and fails closed for unknown internal states", () => {
    expect(solidarityOfferStatusLabel("published")).toBe("Publicada");
    expect(solidarityOfferStatusLabel("published", true)).toBe("Vencida");
    expect(solidarityNeedStatusLabel("partially_met")).toBe(
      "Parcialmente atendida",
    );
    expect(solidarityOfferStatusLabel("future_state")).toBe(
      "Indisponível para manutenção",
    );
    expect(solidarityNeedStatusLabel("future_state")).toBe(
      "Indisponível para manutenção",
    );
    expect(organizationPage).not.toMatch(/\?\s*"Pausada"\s*:\s*offer\.status/);
    expect(organizationPage).not.toMatch(/\?\s*"Cancelada"\s*:\s*need\.status/);
  });

  it("keeps Feirinha inside Participar and never adds a fifth Home door", () => {
    expect(participatePage).toContain("Conhecer a Feirinha");
    expect(participatePage).toContain("/comun/cooperativas");
    expect(directoryPage).toContain("Trocas e economia solidária");
    expect(directoryPage).not.toMatch(/checkout|seller center|painel do vendedor/i);
  });

  it("makes public/private boundaries and empty states explicit without relaxing gates", () => {
    expect(organizationPage).toContain("Área privada da organização");
    expect(organizationPage).toContain("Área privada de participação");
    expect(organizationPage).toContain(
      "não há interesses ou ajudas aguardando resposta",
    );
    expect(directoryPage).toContain("publicadas no COMUN");
    expect(organizationPage).toContain("publicadas no COMUN");
    expect(participationPage).toContain("Conhecer a Feirinha");
  });

  it("continues an approved onboarding directly to the canonical organization", () => {
    expect(onboardingPage).toContain("approvedTerritoryId");
    expect(onboardingPage).toContain("organizationSlug");
    expect(onboardingPage).toContain("Continuar na organização");
    expect(onboardingPage).toContain("Ver em Minha participação");
    expect(onboardingPage).not.toMatch(/requestSubmit\(/);
  });

  it("does not add economic propagation, payments, orders, chat, or private public DTO fields", () => {
    const experienceFiles = [
      directoryPage,
      organizationPage,
      onboardingPage,
      participationPage,
    ].join("\n");
    for (const forbiddenWrite of [
      "insert into public.comun_community_memberships",
      "insert into public.comun_pauta_memberships",
      "insert into public.comun_collective_action_participants",
      "insert into public.comun_community_work_groups",
    ]) {
      expect(experienceFiles.toLowerCase()).not.toContain(forbiddenWrite);
    }
    expect(directoryPage).not.toMatch(/private_contact|contact_private|internal_notes/);
    expect(experienceFiles).not.toMatch(/payment intent|shopping cart|seller account/i);
  });
});
