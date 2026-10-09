import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  externalDestination,
  owned,
  image,
  seal,
  unseal,
  requireEmptyTarget,
  normalizeDump,
} from "./recovery-disposable.mjs";

test("dump comparison normalizes set ordering, never permissions or expressions", () => {
  const a =
    "CREATE POLICY x ON public.t FOR SELECT TO authenticated, anon USING (true);\nALTER DEFAULT PRIVILEGES FOR ROLE x GRANT SELECT ON TABLES TO b;\n\nALTER DEFAULT PRIVILEGES FOR ROLE x GRANT SELECT ON TABLES TO a;\n\n";
  const b =
    "CREATE POLICY x ON public.t FOR SELECT TO anon, authenticated USING (true);\nALTER DEFAULT PRIVILEGES FOR ROLE x GRANT SELECT ON TABLES TO a;\n\nALTER DEFAULT PRIVILEGES FOR ROLE x GRANT SELECT ON TABLES TO b;\n\n";
  assert.equal(normalizeDump(a), normalizeDump(b));
  for (const changed of [
    b.replace("SELECT ON TABLES TO a", "ALL ON TABLES TO a"),
    b.replace("USING (true)", "USING (false)"),
    b.replace("anon, authenticated", "anon"),
    b.replace("POLICY x", "POLICY y"),
  ]) {
    assert.notEqual(normalizeDump(a), normalizeDump(changed));
  }
  assert.notEqual(
    normalizeDump("CHECK ((a AND b) AND c)"),
    normalizeDump("CHECK (a AND b AND c)"),
  );
});

test("backup destination refuses repository, descendants and relative paths", () => {
  const repo = resolve(tmpdir(), "comun-unit-repo");
  const outside = resolve(tmpdir(), "comun-unit-private");
  assert.throws(() => externalDestination("backups"));
  assert.throws(() => externalDestination(repo, repo));
  assert.throws(() => externalDestination(resolve(repo, "artifacts"), repo));
  assert.throws(() => externalDestination(resolve(repo, "..secret"), repo));
  assert.equal(externalDestination(outside, repo), outside);
});
test("ownership guard rejects another run, changed image and network access", () => {
  const valid = {
    Config: { Labels: { "comun.recovery.synthetic": "run-a" }, Image: image },
    HostConfig: { NetworkMode: "none" },
  };
  owned(valid, "run-a");
  assert.throws(() => owned(valid, "run-b"), /NOT_OWNED/);
  assert.throws(
    () =>
      owned(
        { ...valid, Config: { ...valid.Config, Image: "postgres:latest" } },
        "run-a",
      ),
    /IMAGE_DRIFT/,
  );
  assert.throws(
    () => owned({ ...valid, HostConfig: { NetworkMode: "bridge" } }, "run-a"),
    /NOT_ISOLATED/,
  );
});
test("ciphertext roundtrip preserves binary archive, with distinct nonces", () => {
  const key = randomBytes(32),
    payload = randomBytes(65536);
  const a = seal(payload, key),
    b = seal(payload, key);
  assert.notDeepEqual(a, b);
  assert.deepEqual(unseal(a, key), payload);
});
test("tampered payload, header, tag, wrong key and truncated envelope all fail closed", () => {
  const key = randomBytes(32),
    sealed = seal(Buffer.from("SYNTHETIC"), key);
  for (const index of [0, 15, sealed.length - 1]) {
    const tampered = Buffer.from(sealed);
    tampered[index] ^= 1;
    assert.throws(() => unseal(tampered, key));
  }
  assert.throws(() => unseal(sealed, randomBytes(32)));
  assert.throws(() => unseal(sealed.subarray(0, 20), key), /TRUNCATED/);
});
test("restore refuses nonempty and unknown destinations instead of clean/overwrite", () => {
  requireEmptyTarget(0);
  for (const count of [1, 240, -1, undefined, NaN, "0"])
    assert.throws(() => requireEmptyTarget(count), /NONEMPTY_TARGET_REFUSED/);
});
