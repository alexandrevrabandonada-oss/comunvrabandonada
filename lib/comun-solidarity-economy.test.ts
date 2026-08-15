import { describe, expect, it } from "vitest";
import {
  formatSolidarityPriceBRL,
  isComunSolidarityEconomyPublicCoreEnabled,
  projectPublicSolidarityEconomyDirectory,
  type RawSolidarityDirectoryRows,
} from "./comun-solidarity-economy";

const now = new Date("2026-08-15T12:00:00.000Z");

function rows(): RawSolidarityDirectoryRows {
  return {
    territories: [{ id: "territory-1", slug: "rede-solidaria", municipality: "Volta Redonda", neighborhood: "Retiro", public_approximate_address: "Retiro, Volta Redonda", status: "active", visibility: "public", verification_status: "verified", private_location: "PRIVATE_SENTINEL" }],
    organizations: [{ territory_id: "territory-1", public_name: "Rede Solidária", organization_type: "cooperative", status: "active", verification_status: "source_checked", presentation_public: "Organização pública verificada.", services_public: ["Costura", "Costura"], service_territory_public: "Volta Redonda", public_contact_authorized: "contato público", private_contact: "PRIVATE_SENTINEL", last_verified_at: "2026-08-10T10:00:00.000Z" }],
    offers: [{ id: "offer-1", slug: "oficina-costura", organization_territory_id: "territory-1", title: "Oficina de costura", public_summary: "A organização oferece uma oficina comunitária.", offer_kind: "skill", modalities: ["exchange", "cooperation"], price_amount_cents: null, price_currency: null, price_note_public: null, availability_public: "Agendamento prévio", status: "published", reviewed_at: "2026-08-10T10:00:00.000Z", published_at: "2026-08-11T10:00:00.000Z", valid_until: "2026-09-01T10:00:00.000Z", internal_notes: "PRIVATE_SENTINEL" }],
    needs: [{ id: "need-1", slug: "maquina-costura", title: "Máquina de costura", public_summary: "A organização procura uma máquina em condição de uso.", need_type: "equipment", status: "open", visibility: "public", organization_territory_id: "territory-1", territory_id: "territory-1", due_at: null, responsible_internal: "PRIVATE_SENTINEL", action_id: "legacy" }],
  };
}

describe("public solidarity economy projection", () => {
  it("is fail closed and enables only the literal flag value", () => {
    expect(isComunSolidarityEconomyPublicCoreEnabled({})).toBe(false);
    expect(isComunSolidarityEconomyPublicCoreEnabled({ COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "true" })).toBe(false);
    expect(isComunSolidarityEconomyPublicCoreEnabled({ COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED: "enabled" })).toBe(true);
  });

  it("projects eligible organizations, current offers, and public needs without private fields", () => {
    const result = projectPublicSolidarityEconomyDirectory(rows(), { now });
    expect(result.organizations).toHaveLength(1);
    expect(result.organizations[0].services).toEqual(["Costura"]);
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].priceAmountCents).toBeNull();
    expect(result.needs).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    expect(JSON.stringify(result)).not.toContain("action_id");
  });

  it.each([
    ["unknown organization status", () => { const value = rows(); value.organizations[0].status = "unexpected"; return value; }],
    ["unverified organization", () => { const value = rows(); value.organizations[0].verification_status = "unverified"; return value; }],
    ["unknown verification status", () => { const value = rows(); value.organizations[0].verification_status = "reviewed_somehow"; return value; }],
    ["ineligible parent territory", () => { const value = rows(); value.territories[0].visibility = "internal"; return value; }],
  ])("hides the organization child gate for %s", (_label, makeRows) => {
    const result = projectPublicSolidarityEconomyDirectory(makeRows(), { now });
    expect(result.organizations).toEqual([]);
    expect(result.offers).toEqual([]);
    expect(result.needs).toEqual([]);
  });

  it("never falls back from missing public contact to private contact", () => {
    const value = rows();
    value.organizations[0].public_contact_authorized = "";
    const result = projectPublicSolidarityEconomyDirectory(value, { now });
    expect(result.organizations[0].publicContact).toBeNull();
  });

  it.each([
    ["draft", { status: "draft" }],
    ["expired", { valid_until: "2026-08-15T11:59:59.000Z" }],
    ["unreviewed", { reviewed_at: null }],
    ["unknown kind", { offer_kind: "product" }],
    ["unknown modality", { modalities: ["auction"] }],
    ["invalid currency", { price_amount_cents: 100, price_currency: "USD" }],
  ])("hides %s offers", (_label, change) => {
    const value = rows(); Object.assign(value.offers[0], change);
    expect(projectPublicSolidarityEconomyDirectory(value, { now }).offers).toEqual([]);
  });

  it("keeps territorial needs only with an eligible public territory", () => {
    const value = rows();
    value.needs[0].organization_territory_id = null;
    expect(projectPublicSolidarityEconomyDirectory(value, { now }).needs).toHaveLength(1);
    value.needs[0].territory_id = null;
    expect(projectPublicSolidarityEconomyDirectory(value, { now }).needs).toEqual([]);
  });

  it("does not present missing price as zero", () => {
    expect(formatSolidarityPriceBRL(null)).toBeNull();
    expect(formatSolidarityPriceBRL(1234)).toContain("12,34");
  });

  it("bounds each public collection and reports the safety cap", () => {
    const value = rows();
    value.organizations = [...value.organizations, { ...value.organizations[0], territory_id: "territory-2" }];
    const result = projectPublicSolidarityEconomyDirectory(value, { now, limit: 1 });
    expect(result.organizations).toHaveLength(1);
    expect(result.coverageState).toBe("partial_due_to_safety_cap");
  });
});
