import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditExperience } from "./audit-comun-experience-coherence.mjs";

test("contrato de coerência cobre rotas, pilotos, tokens e roadmap", async () => {
  const report = await auditExperience();
  // The dormant, feature-flagged /comun/relata and /comun/onibus routes are part of the App Router inventory.
  // Includes feature-flagged read-only observatories for Calçadas, Transporte and Ambiente.
  // Includes the fail-closed, feature-flagged low-friction Pauta creation route.
  // Includes the fail-closed organization detail in the existing Feirinha root.
  // Includes four fail-closed A3 write routes scoped to an authorized organization.
  // Includes the fail-closed A4 onboarding start and continuation routes.
  // Includes the two fail-closed A5 contextual connection routes.
  // Includes the fail-closed A6 organization profile self-management route.
  // Includes the A5-A2 private curation workspaces for Oral History, Radio and Artwork.
  // Includes the A5-A3 read-only cultural curation desk.
  // Includes the public /comun/denuncias single door over the existing Relata engine.
  // Includes the B0 /comun/denuncias/mapa route; it remains cloaked while the Production map flag is OFF.
  assert.equal(report.routeInventory.totalPages, 228);
  assert.equal(report.routeInventory.missingRequiredRoutes, 0);
  assert.equal(report.routeInventory.knownCompatibleRedirects, 1);
  assert.deepEqual(report.pilots.levels, [0, 1, 2]);
  assert.deepEqual(report.findings, []);
  assert.equal(
    report.result,
    "COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL",
  );
  assert.equal(report.humanUsabilityRehearsal, "required");
});

test("workflow limita a uma repetição o reset descartável após 502", () => {
  const workflow = readFileSync(
    ".github/workflows/comun-experience-coherence.yml",
    "utf8",
  );

  assert.match(workflow, /grep -q "Error status 502"/);
  assert.match(
    workflow,
    /COMUN_EXPERIENCE_COHERENCE_LOCAL_RESET_502_SINGLE_RETRY/,
  );
  assert.equal(
    workflow.match(
      /node scripts\/run-pauta-action-cycle-local-reset\.mjs reset/g,
    )?.length,
    2,
  );
});
