import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {
  assertReceipt,
  parseArguments,
} from "./rehearse-offsite-encrypted-recovery.mjs";

const valid = {
  kind: "SYNTHETIC_OFFSITE_ENCRYPTED_DUMP_NOT_REAL_BACKUP",
  image: "postgres:17",
  imageId:
    "sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675",
  ageVersion: "v1.3.2",
  createdAt: "2026-10-24T23:30:11.314Z",
  plaintextDumpPersisted: false,
  sourceCleanupAbsent: true,
  keyCustody: "EPHEMERAL_SYNTHETIC_NOT_REAL_RECOVERY_KEY",
  cipherSha256: "a".repeat(64),
  plainSha256: "b".repeat(64),
  syntheticRows: 2,
  source: "OWNED_NETWORK_NONE_DISPOSABLE_DATABASE",
};
const absolute = path.resolve("synthetic-only");

test("receipt explicitly describes a pinned synthetic proof, never a real backup", () => {
  assert.doesNotThrow(() => assertReceipt(valid));
});

for (const [field, value] of [
  ["kind", "REAL_BACKUP_GREEN"],
  ["image", "postgres:latest"],
  ["imageId", "sha256:" + "0".repeat(64)],
  ["ageVersion", "unverified"],
  ["createdAt", "unexpected-private-value"],
  ["plaintextDumpPersisted", true],
  ["sourceCleanupAbsent", false],
  ["keyCustody", "USER_RECOVERY_KEY"],
  ["unexpectedPrivateField", "never-log-this"],
  ["cipherSha256", "not-a-digest"],
  ["plainSha256", "0".repeat(63)],
  ["syntheticRows", 3],
  ["source", "PRODUCTION"],
]) {
  test(`reject altered receipt field ${field}`, () => {
    assert.throws(() => assertReceipt({ ...valid, [field]: value }), {
      message: "COMUN_ENCRYPTED_RECOVERY_FAILED",
    });
  });
}

test("only two explicit synthetic CLI stages with absolute paths are admitted", () => {
  assert.equal(
    parseArguments([
      "prepare",
      "--root",
      absolute,
      "--age",
      absolute,
      "--keygen",
      absolute,
    ]).mode,
    "prepare",
  );
  assert.equal(
    parseArguments([
      "verify",
      "--directory",
      absolute,
      "--age",
      absolute,
      "--downloaded",
      absolute,
    ]).mode,
    "verify",
  );
});

test("remote mode, unknown switches, missing/repeated options and relative paths fail closed", () => {
  for (const args of [
    [],
    ["remote", "--root", absolute, "--age", absolute, "--keygen", absolute],
    [
      "prepare",
      "--source-url",
      absolute,
      "--age",
      absolute,
      "--keygen",
      absolute,
    ],
    ["prepare", "--root", absolute, "--age", absolute, "--age", absolute],
    ["prepare", "--root", "relative", "--age", absolute, "--keygen", absolute],
    ["prepare", "--root", absolute, "--age", absolute],
    [
      "prepare",
      "--root",
      absolute,
      "--age",
      absolute,
      "--keygen",
      absolute,
      "--remote",
    ],
  ])
    assert.throws(() => parseArguments(args), {
      message: "COMUN_ENCRYPTED_RECOVERY_FAILED",
    });
});
