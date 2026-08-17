import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260817012247_comun_solidarity_organization_profile_self_management.sql",
  ),
  "utf8",
);
const contract = readFileSync(
  resolve(root, "lib/comun-solidarity-organization-profile.ts"),
  "utf8",
);
const server = readFileSync(
  resolve(root, "lib/server/comun-solidarity-organization-profile.ts"),
  "utf8",
);
const action = readFileSync(
  resolve(root, "app/comun/cooperativas/[slug]/editar-perfil/actions.ts"),
  "utf8",
);
const form = readFileSync(
  resolve(root, "components/comun-solidarity-organization-profile-form.tsx"),
  "utf8",
);
const publicAdapter = readFileSync(
  resolve(root, "lib/comun-solidarity-economy.ts"),
  "utf8",
);

describe("COMUN 48.4-A6 database, route and privacy contract", () => {
  it("extends only the A3 ledger and creates no business root", () => {
    expect(migration).toContain(
      "alter table private.comun_solidarity_economic_content_events",
    );
    expect(migration).toContain("'organization_profile'");
    expect(migration).toContain("'organization_profile.edit'");
    expect(migration).not.toMatch(/create table/i);
    expect(migration).not.toMatch(/organization_profile_events|profile_history_v2|profile_audit/i);
  });

  it("keeps the RPC service-role-only with a safe search path", () => {
    expect(migration).toContain("security definer\nset search_path = pg_catalog");
    expect(migration).toContain(
      "revoke all on function public.comun_update_solidarity_organization_profile_by_access_v1",
    );
    expect(migration).toContain(
      "grant execute on function public.comun_update_solidarity_organization_profile_by_access_v1",
    );
    expect(migration).toContain("to service_role");
  });

  it("revalidates A2/A1 in the database and protects cross-organization edits", () => {
    expect(migration).toContain(
      "private.comun_require_solidarity_economic_access(\n    p_organization_territory_id,\n    p_actor_user_id",
    );
    expect(migration).toContain(
      "where organization.territory_id = p_organization_territory_id\n  for update",
    );
    expect(server).toContain("getMySolidarityOrganizationAccess");
    expect(server).toContain('access?.state !== "active"');
    expect(server).toContain('["editor", "facilitator"]');
  });

  it("updates only the four A6 fields plus technical updated_at", () => {
    const update = migration.match(
      /update public\.comun_territorial_organizations organization[\s\S]+?where organization\.territory_id = p_organization_territory_id;/,
    )?.[0];
    expect(update).toBeTruthy();
    expect(update).toContain("presentation_public = v_presentation");
    expect(update).toContain("services_public = v_services");
    expect(update).toContain("service_territory_public = v_service_territory");
    expect(update).toContain("public_contact_authorized = v_public_contact");
    for (const protectedField of [
      "public_name =",
      "organization_type =",
      "status =",
      "verification_status =",
      "last_verified_at =",
      "private_contact =",
      "internal_notes =",
    ])
      expect(update).not.toContain(protectedField);
  });

  it("uses optimistic concurrency, idempotency and bounded actor rate limits", () => {
    expect(migration).toContain("v_organization.updated_at <> p_expected_updated_at");
    expect(migration).toContain("COMUN_SOLIDARITY_PROFILE_CONFLICT");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("interval '10 minutes'");
    expect(migration).toContain(">= 10");
    expect(migration).toContain("interval '24 hours'");
    expect(migration).toContain(">= 30");
    expect(migration).not.toMatch(/ip_address|raw_ip|user_agent/i);
  });

  it("bounds private snapshots to the four allowed keys", () => {
    expect(migration).toContain("before_payload_private jsonb");
    expect(migration).toContain("after_payload_private jsonb");
    expect(migration.match(/octet_length\([^)]*payload_private::text\) <= 8192/g))
      .toHaveLength(2);
    for (const field of [
      "presentation_public",
      "services_public",
      "service_territory_public",
      "public_contact_authorized",
    ])
      expect(migration).toContain(`'${field}'`);
    for (const privateField of [
      "private_contact",
      "internal_notes",
      "contact_private",
      "source_url",
    ])
      expect(migration).not.toContain(`'${privateField}'`);
  });

  it("separates prose safety from explicitly consented public contact", () => {
    expect(migration).toContain("comun_solidarity_economic_content_is_safe");
    expect(migration).toContain("comun_solidarity_public_contact_is_safe");
    expect(migration).toContain("p_public_contact_confirmed is not true");
    expect(action).toContain("solidarityOrganizationPublicContactNeedsConfirmation");
    expect(form).toContain("Este contato ficará visível publicamente");
    expect(form).toContain('name="public_contact_confirmed"');
    expect(form).toContain("required");
  });

  it("keeps private audit and identities outside the public DTO and UI", () => {
    for (const forbidden of [
      "beforePayloadPrivate",
      "afterPayloadPrivate",
      "actorUserId",
      "actorAccessId",
      "requestId",
      "privateContact",
      "lastEditor",
      "revisionId",
    ])
      expect(publicAdapter).not.toContain(forbidden);
    expect(server).not.toMatch(/select\([^)]*(private_contact|internal_notes)/);
    expect(form).not.toMatch(/private_contact|contact_private|actor_user_id|actor_access_id/);
  });

  it("adds no economic or social propagation", () => {
    for (const forbidden of [
      "comun_solidarity_offers",
      "comun_territorial_needs",
      "comun_solidarity_offer_interests",
      "comun_pauta_memberships",
      "comun_community_memberships",
      "comun_collective_action_participations",
      "comun_community_work_groups",
    ])
      expect(migration + action).not.toContain(forbidden);
  });

  it("uses one contextual route and no parallel dashboard", () => {
    expect(contract).toContain(
      "COMUN_SOLIDARITY_ORGANIZATION_PROFILE_SELF_EDIT_ENABLED",
    );
    expect(action).toContain("/editar-perfil");
    expect(form).toContain("Salvar alterações");
    expect(form + action).not.toMatch(/seller|owner|profile-admin|organization-dashboard/i);
  });
});
