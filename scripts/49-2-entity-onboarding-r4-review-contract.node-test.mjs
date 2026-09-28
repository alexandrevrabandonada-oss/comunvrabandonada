import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ownerPage = readFileSync("app/comun/entidades/page.tsx", "utf8");
const ownerActions = readFileSync("app/comun/entidades/actions.ts", "utf8");
const reviewPage = readFileSync("app/comun/admin/entidades/revisao/page.tsx", "utf8");
const adminActions = readFileSync("app/comun/admin/entidades/actions.ts", "utf8");
const memberNav = readFileSync("components/comun-navigation.tsx", "utf8");
const adminNav = readFileSync("components/comun-admin-shell-client.tsx", "utf8");

test("member onboarding is authenticated and never accepts actor identity", () => {
  assert.match(ownerPage, /requireCommunitySession\("\/comun\/entidades"\)/);
  assert.match(ownerActions, /requireCommunitySession\("\/comun\/entidades"\)/);
  assert.doesNotMatch(
    ownerPage + ownerActions,
    /name=["'](?:user_id|actor_user_id|representation_id|consent_id)["']/i,
  );
  assert.match(memberNav, /Entidades.*\/comun\/entidades/s);
});

test("consent and representation revocation require explicit confirmation", () => {
  assert.match(ownerActions, /confirm_consent/);
  assert.match(ownerActions, /confirm_revocation/);
  assert.match(ownerActions, /confirm_representation_revocation/);
  assert.match(ownerPage, /future projection|futura projeção|projeção pública sanitizada/i);
  assert.match(ownerPage, /não abrem o mapa|não abre o mapa/i);
});

test("candidate preparation is explicit and separate from consent", () => {
  assert.match(ownerPage, /prepareCollectiveEntityCandidateFormAction/);
  assert.match(ownerActions, /prepareOwnCollectiveEntityCandidate/);
  assert.doesNotMatch(
    ownerActions,
    /setOwnCollectiveEntityConsent[\s\S]{0,500}prepareOwnCollectiveEntityCandidate/,
  );
  assert.match(ownerPage, /Enviar para revisão de legitimidade/);
});

test("R4 review desk is role restricted and browser cannot choose reviewer", () => {
  assert.match(
    reviewPage,
    /requireComunAdminRole\(\[\s*"admin",\s*"editor",\s*"factual_reviewer",?\s*\]\)/,
  );
  assert.match(
    adminActions,
    /requireComunAdminRole\(\["admin", "editor", "factual_reviewer"\]\)/,
  );
  assert.doesNotMatch(
    reviewPage + adminActions,
    /name=["'](?:reviewer_user_id|reviewer_profile_id|actor_user_id)["']/i,
  );
  assert.match(adminNav, /Revisão de entidades.*\/comun\/admin\/entidades\/revisao/s);
});

test("review form mirrors R4 decision and basis contract", () => {
  assert.match(adminActions, /COMUN_COLLECTIVE_ENTITY_REVIEW_STAGES\.includes/);
  assert.match(adminActions, /COMUN_COLLECTIVE_ENTITY_REVIEW_DECISIONS\.includes/);
  assert.match(adminActions, /COMUN_COLLECTIVE_ENTITY_REVIEW_BASIS\.includes/);
  assert.match(adminActions, /decision === "needs_evidence"[\s\S]*insufficient_or_conflicting/);
  assert.match(reviewPage, /needs_independent_review/);
  assert.match(reviewPage, /revisores distintos/);
});

test("upstream operational surfaces cannot publish or open map", () => {
  const source = ownerPage + ownerActions + reviewPage + adminActions;
  assert.doesNotMatch(
    source,
    /server_projection_decide|future_map_eligibility|COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED|public_latitude|public_longitude|pmtiles/i,
  );
  assert.doesNotMatch(source, /SUPABASE_DB_URL|comun:promover|workflow_dispatch/);
});
