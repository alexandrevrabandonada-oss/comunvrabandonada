import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/comun/admin/entidades/page.tsx", "utf8");
const actions = readFileSync("app/comun/admin/entidades/actions.ts", "utf8");
const nav = readFileSync("components/comun-admin-shell-client.tsx", "utf8");
const surface = readFileSync("lib/comun-surface-migration.ts", "utf8");
const runtime = readFileSync(
  "lib/comun-collective-entity-projection-runtime.ts",
  "utf8",
);

test("publisher desk is a publisher-only admin surface", () => {
  assert.match(page, /requireComunAdminRole\(\["publisher"\]\)/);
  assert.match(actions, /requireComunAdminRole\(\["publisher"\]\)/);
  assert.match(nav, /Entidades coletivas.*\/comun\/admin\/entidades/s);
  assert.match(surface, /\/comun\/admin\/entidades/);
  assert.match(surface, /entidades: "Entidades coletivas"/);
});

test("desk reads only R5 queue and sanitized active projection DTO", () => {
  assert.match(page, /listCollectiveEntityProjectionReviewQueue/);
  assert.match(page, /listSanitizedCollectiveEntityPublicProjections/);
  assert.match(page, /projection\.publicName/);
  assert.match(page, /projection\.entityType/);
  assert.match(page, /projection\.publishedAt/);
  assert.doesNotMatch(
    page,
    /publisher_auth_user_id|publisher_profile_id|rationale_private.*activeProjections|representation_id|consent_id|latitude|longitude/i,
  );
});

test("browser cannot select publisher identity and publish needs explicit confirmation", () => {
  assert.doesNotMatch(
    page + actions,
    /name=["'](?:publisher_user_id|publisher_profile_id|actor_user_id)["']/i,
  );
  assert.match(runtime, /p_publisher_user_id: userId/);
  assert.match(actions, /decision === "publish"[\s\S]*confirm_publication/);
  assert.match(page, /defaultValue="hold"/);
  assert.match(page, /name="confirm_publication"/);
});

test("form action validates idempotency ids and maps database errors safely", () => {
  assert.match(actions, /UUID_PATTERN\.test\(requestId\)/);
  assert.match(actions, /UUID_PATTERN\.test\(candidateId\)/);
  assert.match(actions, /COMUN_COLLECTIVE_ENTITY_PROJECTION_DECISIONS\.includes/);
  assert.match(actions, /COMUN_RELATA_PROJECTION_SELF_PUBLISH_FORBIDDEN/);
  assert.match(actions, /COMUN_RELATA_PROJECTION_REVIEW_UNAVAILABLE/);
  assert.doesNotMatch(actions, /redirect\([^)]*error\.message/);
});

test("publisher desk keeps map and report publication out of scope", () => {
  assert.doesNotMatch(
    page + actions,
    /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED|public_latitude|public_longitude|pmtiles|report_id/i,
  );
  assert.match(page, /não abre mapa/);
  assert.match(page, /future_map_eligibility/);
});

test("this slice adds no automatic Production business execution", () => {
  assert.doesNotMatch(page + actions, /workflow_dispatch|comun:promover|SUPABASE_DB_URL/);
});
