import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const M6_SUPABASE_IMAGES = Object.freeze([
  {
    name: "auth",
    alias: "public.ecr.aws/supabase/gotrue:v2.196.0",
    pinned:
      "ghcr.io/supabase/gotrue:v2.196.0@sha256:c0c25187a6b835e65a6f6e6c6b39d090e832d40e6de5186f2c038e0411944232",
  },
  {
    name: "postgrest",
    alias: "public.ecr.aws/supabase/postgrest:v16.2",
    pinned:
      "ghcr.io/supabase/postgrest:v16.2@sha256:85258123312dc496ad4c2ed832154a65e9746f84df0d6d09b44229ff9230c08e",
  },
]);

function docker(args) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { ok: result.status === 0, stdout: result.stdout ?? "" };
}

function verifiedImageId(run, reference) {
  const result = run(["image", "inspect", "--format", "{{.Id}}", reference]);
  const id = result.stdout.trim();
  if (!result.ok || !/^sha256:[a-f0-9]{64}$/.test(id)) {
    throw new Error("M6_IMAGE_INSPECT_FAILED");
  }
  return id;
}

/**
 * Prefer official Supabase GHCR manifest digests and tag locally under
 * the aliases required by the existing, isolated M6 harness.
 * Preserve the previous ECR version-tag path only as a labeled fallback;
 * neither source may silently turn an unavailable image into PASS.
 */
export function prepareM6Images({ run = docker, log = console.log } = {}) {
  if (!run(["pull", "postgres:17"]).ok) {
    throw new Error("M6_POSTGRES_PULL_FAILED");
  }
  const results = [];
  for (const image of M6_SUPABASE_IMAGES) {
    let source;
    if (run(["pull", image.pinned]).ok) {
      if (!run(["tag", image.pinned, image.alias]).ok) {
        throw new Error("M6_IMAGE_TAG_FAILED:" + image.name);
      }
      const pinnedId = verifiedImageId(run, image.pinned);
      const aliasId = verifiedImageId(run, image.alias);
      if (pinnedId !== aliasId) {
        throw new Error("M6_IMAGE_ID_MISMATCH:" + image.name);
      }
      source = "ghcr-digest-pinned";
    } else {
      log("M6_IMAGE_FALLBACK_TO_EXISTING_ECR:" + image.name);
      if (!run(["pull", image.alias]).ok) {
        throw new Error("M6_IMAGE_BOTH_REGISTRIES_UNAVAILABLE:" + image.name);
      }
      verifiedImageId(run, image.alias);
      source = "ecr-version-tag-fallback";
    }
    results.push({ name: image.name, source });
    log("M6_IMAGE_READY:" + image.name + ":" + source);
  }
  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    prepareM6Images();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
