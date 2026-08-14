import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditExperience } from "./audit-comun-experience-coherence.mjs";

test("contrato de coerência cobre rotas, pilotos, tokens e roadmap", async () => {
  const report = await auditExperience();
  // The dormant, feature-flagged /comun/relata and /comun/onibus routes are part of the App Router inventory.
  // Includes feature-flagged read-only observatories for Calçadas, Transporte and Ambiente.
  assert.equal(report.routeInventory.totalPages, 209);
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
