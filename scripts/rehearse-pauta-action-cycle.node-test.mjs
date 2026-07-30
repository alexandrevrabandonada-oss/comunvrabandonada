import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_PROJECT_REF,
  classifyRehearsalTarget,
  REHEARSAL_CONFIRMATION,
  rehearsalStages,
} from "./rehearse-pauta-action-cycle.mjs";

test("local rehearsal is allowed without remote credentials", () => {
  assert.equal(
    classifyRehearsalTarget({
      connectionString: "postgresql://local@127.0.0.1:5432/db",
    }),
    "local",
  );
});

test("remote rehearsal fails closed without the exact contract", () => {
  for (const input of [
    {},
    { controlledRemote: true },
    { controlledRemote: true, confirmation: REHEARSAL_CONFIRMATION },
    {
      controlledRemote: true,
      confirmation: "wrong",
      projectRef: CANONICAL_PROJECT_REF,
    },
  ])
    assert.throws(
      () =>
        classifyRehearsalTarget({
          connectionString: "postgresql://masked@remote.invalid/db",
          ...input,
        }),
      /REMOTE_REHEARSAL_BLOCKED/,
    );
});

test("remote rehearsal accepts only the allowlisted project and confirmation", () => {
  assert.equal(
    classifyRehearsalTarget({
      connectionString: "postgresql://masked@remote.invalid/db",
      controlledRemote: true,
      confirmation: REHEARSAL_CONFIRMATION,
      projectRef: CANONICAL_PROJECT_REF,
    }),
    "controlled_remote",
  );
});

test("rehearsal covers the complete political sequence exactly once", () => {
  assert.deepEqual(rehearsalStages, [
    "moderation",
    "conversation",
    "synthesis",
    "decision",
    "action",
    "tasks",
    "forwarding",
    "protocol",
    "response",
    "result",
    "memory",
    "reopened",
  ]);
  assert.equal(new Set(rehearsalStages).size, rehearsalStages.length);
});
