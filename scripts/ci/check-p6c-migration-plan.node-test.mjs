import assert from "node:assert/strict";
import test from "node:test";
import { assessP6cPlan } from "./check-p6c-migration-plan.mjs";

const hardening = "20260922120000_comun_canonical_security_hardening_v2.sql";
const own = {
  "p6c-b1": "20260810155310_comun_public_education_sensitive_routing.sql",
  "p6c-b2": "20260810171448_comun_child_protection_private_routing.sql",
};

for (const lane of Object.keys(own)) {
  test(`${lane} accepts foreign hardening and no own pending migration`, () => {
    assert.deepEqual(assessP6cPlan(lane, [hardening], [hardening]), {
      lane,
      changedMode: "not_applicable",
      domainMigrationCount: 0,
      foreignKnownPendingCount: 1,
      businessRowsRead: false,
    });
  });
  test(`${lane} requires exact owned candidate`, () => {
    assert.equal(
      assessP6cPlan(lane, [own[lane]], [own[lane]]).domainMigrationCount,
      1,
    );
    assert.throws(() =>
      assessP6cPlan(lane, [own[lane]], [own[lane], hardening]),
    );
    assert.throws(() => assessP6cPlan(lane, [hardening], [own[lane]]));
    assert.throws(() =>
      assessP6cPlan(lane, [own[lane], hardening], [own[lane], hardening]),
    );
  });
  test(`${lane} blocks unknown and distinguishes empty`, () => {
    assert.equal(assessP6cPlan(lane, [], []).changedMode, "none");
    assert.throws(() =>
      assessP6cPlan(lane, [hardening], ["20990101000000_unknown.sql"]),
    );
  });
}
