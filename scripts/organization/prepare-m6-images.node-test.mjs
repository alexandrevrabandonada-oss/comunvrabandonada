import assert from "node:assert/strict";
import test from "node:test";
import { M6_SUPABASE_IMAGES, prepareM6Images } from "./prepare-m6-images.mjs";

const SHA = "sha256:" + "a".repeat(64);
const OTHER_SHA = "sha256:" + "b".repeat(64);

function fixture({ failPinned = [], failEcr = [], mismatch = [] } = {}) {
  const calls = [];
  const messages = [];
  const run = (args) => {
    calls.push(args);
    if (args[0] === "pull") {
      if (failPinned.includes(args[1]) || failEcr.includes(args[1])) {
        return { ok: false, stdout: "" };
      }
      return { ok: true, stdout: "" };
    }
    if (args[0] === "image") {
      const isAlias = M6_SUPABASE_IMAGES.some((x) => x.alias === args[4]);
      const value = isAlias && mismatch.includes(args[4]) ? OTHER_SHA : SHA;
      return { ok: true, stdout: value + "\n" };
    }
    return { ok: args[0] === "tag", stdout: "" };
  };
  return { calls, messages, run, log: (message) => messages.push(message) };
}

test("prefers pinned official images and verifies local alias IDs", () => {
  const f = fixture();
  const result = prepareM6Images(f);
  const observed = result.map((image) => image.source);
  const expected = ["ghcr-digest-pinned", "ghcr-digest-pinned"];
  assert.deepEqual(observed, expected);
  for (const image of M6_SUPABASE_IMAGES) {
    const ghcrPull = f.calls.some(
      (x) => x[0] === "pull" && x[1] === image.pinned,
    );
    assert.ok(ghcrPull);
    const validAlias = f.calls.some(
      (x) => x[0] === "tag" && x[1] === image.pinned && x[2] === image.alias,
    );
    assert.ok(validAlias);
    const usedFallback = f.calls.some(
      (x) => x[0] === "pull" && x[1] === image.alias,
    );
    assert.equal(usedFallback, false);
  }
});

test("labels the ECR fallback when GHCR is unavailable", () => {
  const image = M6_SUPABASE_IMAGES[1];
  const f = fixture({ failPinned: [image.pinned] });
  const result = prepareM6Images(f);
  assert.equal(result[1].source, "ecr-version-tag-fallback");
  assert.ok(f.calls.some((x) => x[0] === "pull" && x[1] === image.alias));
  const recorded = f.messages.includes(
    "M6_IMAGE_FALLBACK_TO_EXISTING_ECR:postgrest",
  );
  assert.ok(recorded);
});

test("fails if neither registry can supply a required image", () => {
  const image = M6_SUPABASE_IMAGES[0];
  const f = fixture({ failPinned: [image.pinned], failEcr: [image.alias] });
  assert.throws(
    () => prepareM6Images(f),
    /M6_IMAGE_BOTH_REGISTRIES_UNAVAILABLE:auth/,
  );
});

test("rejects an image alias with a mismatched ID", () => {
  const f = fixture({ mismatch: [M6_SUPABASE_IMAGES[0].alias] });
  assert.throws(() => prepareM6Images(f), /M6_IMAGE_ID_MISMATCH:auth/);
});

test("only accepts official fixed versions and full SHA-256 manifests", () => {
  assert.equal(M6_SUPABASE_IMAGES.length, 2);
  for (const image of M6_SUPABASE_IMAGES) {
    assert.match(
      image.pinned,
      /^ghcr\.io\/supabase\/[^@]+@sha256:[a-f0-9]{64}$/,
    );
    assert.match(image.alias, /^public\.ecr\.aws\/supabase\//);
  }
});
