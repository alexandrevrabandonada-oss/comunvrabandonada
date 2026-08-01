import assert from "node:assert/strict";
import test from "node:test";
import { auditExperience } from "./audit-comun-experience-coherence.mjs";

test("contrato de coerência cobre rotas, pilotos, tokens e roadmap", async () => {
  const report = await auditExperience();
  assert.equal(report.routeInventory.totalPages, 189);
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
