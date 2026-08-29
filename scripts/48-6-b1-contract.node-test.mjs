import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { classifyMigrationLane } from "./ci/classify-migration-lane.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const migration = read(
  "supabase/migrations/20260826120000_comun_denuncias_public_projection_opt_in.sql",
);
const route = read(
  "app/api/comun/denuncias/public-projection-consent/route.ts",
);
const panel = read(
  "app/comun/minha-participacao/public-projection-consent-panel.tsx",
);
const category = read("lib/comun-denuncias-public-opt-in.ts");

test("B1 adds no second schema model and keeps consent holder-owned", () => {
  assert.doesNotMatch(migration, /create\s+table/i);
  assert.match(migration, /comun_participation_wallet_items/);
  assert.match(migration, /wi\.id = p_wallet_item_id/);
  assert.match(migration, /wi\.item_type = 'relata_report'/);
  assert.match(migration, /wi\.subject_ref/);
  assert.doesNotMatch(route, /caseId|reportId|collectiveCaseId|subject_ref/i);
  assert.match(route, /walletItemId/);
  assert.match(
    migration,
    /revoke all on function public\.comun_relata_public_projection_consent/,
  );
  assert.match(
    migration,
    /grant execute on function public\.comun_relata_public_projection_consent.*service_role/is,
  );
});

test("B1 is explicit, narrow, optional and map-off", () => {
  assert.match(category, /public_lighting/);
  assert.match(category, /power_distribution/);
  assert.match(category, /smoke_or_environmental_trace/);
  assert.doesNotMatch(category, /public_health|child_protection|active_fire/);
  assert.match(panel, /Permitir uso territorial anônimo/);
  assert.match(panel, /Agora não/);
  assert.match(panel, /endereço exato/);
  assert.match(panel, /texto original/);
  assert.match(panel, /fotos nem/);
  assert.match(
    panel,
    /Hoje (?:seu\s+relato não entra em mapa público|não\s+há mapa público deste relato)/,
  );
  assert.match(panel, /comparar este relato com outros\s+relatos compatíveis/);
  assert.doesNotMatch(panel, /checked=|defaultChecked/);
  assert.doesNotMatch(
    migration,
    /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.*enabled/i,
  );
});

test("B1 revocation recomputes and withdrawal cannot leave an orphaned projection", () => {
  assert.match(migration, /comun_relata_public_projection_recompute/);
  assert.match(migration, /after update of state, withdrawn_at/);
  assert.match(migration, /WALLET_PUBLIC_PROJECTION_CONSENT_REVOKED/);
});

test("B1 migration ownership is explicit and historical lanes stay fail-closed", () => {
  const migration =
    "supabase/migrations/20260826120000_comun_denuncias_public_projection_opt_in.sql";
  const b0Migration =
    "supabase/migrations/20260826090000_comun_denuncias_public_collective_projection.sql";
  assert.equal(
    classifyMigrationLane("p6c-c", [migration]).mode,
    "not_applicable",
  );
  assert.equal(
    classifyMigrationLane("48-4-a0", [migration]).mode,
    "not_applicable",
  );
  assert.equal(
    classifyMigrationLane("48-5-a0", [b0Migration]).mode,
    "not_applicable",
  );
  assert.equal(
    classifyMigrationLane("p6c-c", [
      "supabase/migrations/20990101000000_unknown.sql",
    ]).mode,
    "blocked",
  );
});
