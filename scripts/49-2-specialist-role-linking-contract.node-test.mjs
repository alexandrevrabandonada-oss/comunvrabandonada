import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/comun/admin/equipe/page.tsx", "utf8");
const specialistActions = readFileSync("app/comun/admin/equipe/actions.ts", "utf8");
const globalActions = readFileSync("app/actions.ts", "utf8");
const readiness = readFileSync("lib/admin-role-readiness.ts", "utf8");

test("role readiness is computed only from active profiles linked to active admin users", () => {
  assert.match(readiness, /comun_admin_profiles/);
  assert.match(readiness, /comun_admin_users/);
  assert.match(readiness, /reviewerCapable >= 2/);
  assert.match(readiness, /publisherCapable >= 1/);
  assert.match(page, /Revisores R4/);
  assert.match(page, /Publishers R5/);
});

test("guided linking resolves an existing Auth account by exact email on the server", () => {
  assert.match(specialistActions, /auth\.admin\.listUsers/);
  assert.match(specialistActions, /user\.email\?\.trim\(\)\.toLowerCase\(\) === email/);
  assert.match(specialistActions, /requireComunAdminRole\(\["admin"\]\)/);
  assert.doesNotMatch(specialistActions, /inviteUserByEmail|createUser\(/);
  assert.match(page, /Nenhum convite será enviado/);
});

test("guided linking cannot grant admin or editor and requires explicit confirmation", () => {
  assert.match(
    specialistActions,
    /"factual_reviewer",[\s\S]*"editorial_reviewer",[\s\S]*"publisher",[\s\S]*"viewer"/,
  );
  assert.doesNotMatch(
    specialistActions.match(/const SPECIALIST_ROLES[\s\S]*?as const/)?.[0] ?? "",
    /"admin"|"editor"/,
  );
  assert.match(specialistActions, /confirm_operational_access/);
  assert.match(page, /name="confirm_operational_access"/);
});

test("guided linking preserves specific conflict errors outside redirect catch paths", () => {
  assert.match(
    specialistActions,
    /SPECIALIST_PROFILE_ALREADY_EXISTS_DIFFERENT/,
  );
  assert.match(
    specialistActions,
    /SPECIALIST_ADMIN_ACCESS_ALREADY_EXISTS/,
  );
  assert.match(
    specialistActions,
    /SPECIALIST_PROFILE_ALREADY_EXISTS_DIFFERENT"[\s\S]*redirectError\("perfil-existente"\)/,
  );
  assert.match(
    specialistActions,
    /SPECIALIST_ADMIN_ACCESS_ALREADY_EXISTS"[\s\S]*redirectError\("acesso-admin-existente"\)/,
  );
});

test("guided linking binds an exact-email, same-role unbound profile with an atomic null guard", () => {
  assert.match(specialistActions, /existing\.email !== input\.email/);
  assert.match(specialistActions, /existing\.role !== input\.role/);
  assert.match(specialistActions, /existing\.auth_user_id !== null && existing\.auth_user_id !== input\.userId/);
  assert.match(specialistActions, /auth_user_id: input\.userId,[\s\S]*?\.eq\("email", input\.email\)[\s\S]*?\.eq\("role", input\.role\)[\s\S]*?\.is\("auth_user_id", null\)/);
  assert.match(specialistActions, /SPECIALIST_PROFILE_BINDING_FAILED/);
});

test("specialist profile is established before base admin access is activated", () => {
  const body =
    specialistActions.match(
      /export async function provisionExistingSpecialistRoleAction[\s\S]*$/,
    )?.[0] ?? "";
  assert.ok(body.indexOf("ensureSpecialistProfile") < body.indexOf("ensureBaseAdminAccess"));
  assert.match(specialistActions, /role: "viewer"/);
  assert.doesNotMatch(specialistActions, /role: "admin"/);
});

test("manual role edits cannot remove one of the last two operational R4 reviewers", () => {
  assert.match(globalActions, /currentOperationalReviewer/);
  assert.match(globalActions, /readiness\.reviewerCapable <= 2/);
  assert.match(globalActions, /admin_collective_entity_reviewer_capacity_protected/);
  assert.match(globalActions, /Mantenha pelo menos dois revisores R4 operacionais/);
});

test("role-linking slice does not publish entities or open map", () => {
  const source = page + specialistActions + globalActions + readiness;
  assert.doesNotMatch(
    source,
    /server_projection_decide|future_map_eligibility|COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED|public_latitude|public_longitude|pmtiles/i,
  );
});
