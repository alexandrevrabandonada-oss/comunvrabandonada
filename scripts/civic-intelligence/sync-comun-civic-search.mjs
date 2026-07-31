import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const started = Date.now();
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!endpoint || !serviceKey)
  throw new Error("COMUN_CIVIC_REMOTE_CONFIGURATION_MISSING");

const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(endpoint);
if (!isLocal) {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const allowed = (process.env.COMUN_CIVIC_ALLOWED_PROJECT_REFS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !projectRef ||
    !allowed.includes(projectRef) ||
    !endpoint.includes(`${projectRef}.supabase.co`)
  ) {
    throw new Error("COMUN_CIVIC_TARGET_NOT_ALLOWLISTED");
  }
}

const client = createClient(endpoint, serviceKey, {
  auth: { persistSession: false },
});
const useFakeProvider =
  isLocal && process.env.COMUN_CIVIC_FAKE_EMBEDDINGS === "1";
const fakeEmbedding = (input) => {
  const vector = Array.from({ length: 384 }, (_, index) =>
    Math.sin((index + 1) * (input.charCodeAt(index % input.length) || 1)),
  );
  const norm =
    Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
};
const { data: sync, error: syncError } = await client.rpc(
  "comun_sync_public_search_projection",
);
if (syncError) {
  console.error(
    JSON.stringify({
      step: "projection_sync",
      code: syncError.code || "unknown",
      message: syncError.message || "failed",
    }),
  );
  throw new Error("COMUN_CIVIC_PROJECTION_SYNC_FAILED");
}

let completed = 0;
let failed = 0;
let batches = 0;
for (; batches < 100; batches += 1) {
  const { data: jobs, error: claimError } = await client.rpc(
    "comun_claim_search_embedding_jobs",
    { p_limit: 16 },
  );
  if (claimError) throw new Error("COMUN_CIVIC_JOB_CLAIM_FAILED");
  if (!jobs?.length) break;
  try {
    const invocation = useFakeProvider
      ? {
          data: {
            model: "fixture-provider",
            version: "fixture-v1",
            dimensions: 384,
            embeddings: jobs.map((job) => fakeEmbedding(job.public_text)),
          },
          error: null,
        }
      : await client.functions.invoke("comun-civic-embed", {
          body: {
            kind: "documents",
            inputs: jobs.map((job) => job.public_text),
            publicProjection: true,
          },
        });
    const { data, error } = invocation;
    if (
      error ||
      data?.dimensions !== 384 ||
      !Array.isArray(data?.embeddings) ||
      data.embeddings.length !== jobs.length
    ) {
      throw new Error("PROVIDER_UNAVAILABLE");
    }
    for (let index = 0; index < jobs.length; index += 1) {
      const vector = data.embeddings[index];
      if (
        !Array.isArray(vector) ||
        vector.length !== 384 ||
        vector.some((value) => !Number.isFinite(value))
      ) {
        throw new Error("INVALID_DIMENSIONS");
      }
      const { data: accepted, error: completionError } = await client.rpc(
        "comun_complete_search_embedding_job",
        {
          p_job_id: jobs[index].job_id,
          p_content_checksum: jobs[index].content_checksum,
          p_model: data.model,
          p_version: data.version,
          p_embedding: `[${vector.join(",")}]`,
        },
      );
      if (completionError || !accepted) throw new Error("STALE_OR_INVALID_JOB");
      completed += 1;
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROVIDER_FAILURE";
    for (const job of jobs) {
      await client.rpc("comun_fail_search_embedding_job", {
        p_job_id: job.job_id,
        p_failure_code: code,
      });
      failed += 1;
    }
    break;
  }
}

const { count: documents } = await client
  .from("comun_search_documents")
  .select("id", { count: "exact", head: true });
const { count: sections } = await client
  .from("comun_search_sections")
  .select("id", { count: "exact", head: true });
const { count: readySections } = await client
  .from("comun_search_sections")
  .select("id", { count: "exact", head: true })
  .eq("indexing_state", "ready");
const evidence = {
  result:
    failed === 0
      ? "COMUN_CIVIC_INDEX_SYNC_GREEN"
      : "COMUN_CIVIC_INDEX_SYNC_PROVIDER_FALLBACK",
  scope: "public_projection",
  target: isLocal ? "disposable_local" : "allowlisted_remote",
  documents: documents ?? 0,
  sections: sections ?? 0,
  readySections: readySections ?? 0,
  completed,
  failed,
  batches,
  sourceChanges: sync?.[0] ?? {
    documents_upserted: 0,
    documents_removed: 0,
    sections_queued: 0,
  },
  model: completed
    ? useFakeProvider
      ? "fixture-provider"
      : "gte-small"
    : "lexical_only",
  dimensions: completed ? 384 : null,
  durationBand:
    Date.now() - started < 10_000
      ? "under_10s"
      : Date.now() - started < 60_000
        ? "10_60s"
        : "over_60s",
  containsRawQueries: false,
  containsIndexedText: false,
  containsIdentifiers: false,
};
await mkdir(".ci-artifacts/civic-intelligence", { recursive: true });
await writeFile(
  ".ci-artifacts/civic-intelligence/index.json",
  `${JSON.stringify(evidence, null, 2)}\n`,
  { mode: 0o600 },
);
console.log(evidence.result);
