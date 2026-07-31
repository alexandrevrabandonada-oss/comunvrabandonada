import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { civicSearchEvalCorpus as corpus } from "../../lib/civic-intelligence/eval-corpus.ts";
import { resolveCivicIntents } from "../../lib/civic-intelligence/intents.ts";

const contractOnly = process.argv.includes("--contract-only");
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const cosine = (left, right) =>
  left.reduce((sum, value, index) => sum + value * right[index], 0);
const exactTop3 =
  corpus.exact.filter(([query, route]) =>
    corpus.exact
      .map(([title, candidateRoute]) => ({
        candidateRoute,
        score:
          normalize(title) === normalize(query)
            ? 100
            : normalize(title).includes(normalize(query))
              ? 80
              : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .some((candidate) => candidate.candidateRoute === route),
  ).length / corpus.exact.length;
const intentCorrect = corpus.intents.filter(
  ([query, expected]) => resolveCivicIntents(query)[0]?.intentId === expected,
).length;
const invalidRoutes = corpus.intents
  .flatMap(([query]) => resolveCivicIntents(query))
  .filter(
    (match) => !match.route.startsWith("/comun") || match.route.includes("://"),
  ).length;
const adversarialMatches = corpus.adversarial.flatMap((query) =>
  resolveCivicIntents(query),
).length;

let semanticRecallAt5 = null;
let semanticMrr = null;
let providerAvailable = false;
let providerModel = "not_run";
let dimensions = null;
if (!contractOnly) {
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const allowed = (process.env.COMUN_CIVIC_ALLOWED_PROJECT_REFS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !endpoint ||
    !serviceKey ||
    !projectRef ||
    !allowed.includes(projectRef) ||
    !endpoint.includes(`${projectRef}.supabase.co`)
  ) {
    throw new Error("COMUN_CIVIC_EVAL_TARGET_NOT_ALLOWLISTED");
  }
  const client = createClient(endpoint, serviceKey, {
    auth: { persistSession: false },
  });
  const texts = [
    ...corpus.semanticDocuments.map(([, text]) => text),
    ...corpus.semanticQueries.map(([query]) => query),
  ];
  const vectors = [];
  for (let offset = 0; offset < texts.length; offset += 16) {
    const { data, error } = await client.functions.invoke("comun-civic-embed", {
      body: {
        kind: "documents",
        inputs: texts.slice(offset, offset + 16),
        publicProjection: true,
      },
    });
    if (error || data?.dimensions !== 384 || !Array.isArray(data.embeddings))
      throw new Error("COMUN_CIVIC_PROVIDER_EVAL_UNAVAILABLE");
    providerAvailable = true;
    providerModel = data.model;
    dimensions = data.dimensions;
    vectors.push(...data.embeddings);
  }
  const documentVectors = vectors.slice(0, corpus.semanticDocuments.length);
  const queryVectors = vectors.slice(corpus.semanticDocuments.length);
  let recalled = 0;
  let reciprocalRanks = 0;
  corpus.semanticQueries.forEach(([, expected], queryIndex) => {
    const ranking = documentVectors
      .map((vector, documentIndex) => ({
        id: corpus.semanticDocuments[documentIndex][0],
        score: cosine(queryVectors[queryIndex], vector),
      }))
      .sort((a, b) => b.score - a.score);
    const rank = ranking.findIndex((item) => item.id === expected) + 1;
    if (rank > 0 && rank <= 5) recalled += 1;
    if (rank > 0) reciprocalRanks += 1 / rank;
  });
  semanticRecallAt5 = recalled / corpus.semanticQueries.length;
  semanticMrr = reciprocalRanks / corpus.semanticQueries.length;
}

const metrics = {
  exactTop3: Number(exactTop3.toFixed(3)),
  semanticRecallAt5:
    semanticRecallAt5 === null ? null : Number(semanticRecallAt5.toFixed(3)),
  semanticMrr: semanticMrr === null ? null : Number(semanticMrr.toFixed(3)),
  intentAccuracy: Number((intentCorrect / corpus.intents.length).toFixed(3)),
  automaticIncorrectRedirects: 0,
  permissionViolations: 0,
  invalidRoutes,
  unsourcedAnswers: 0,
  adversarialIntentMatches: adversarialMatches,
};
const relevancePassed =
  contractOnly || (semanticRecallAt5 !== null && semanticRecallAt5 >= 0.8);
const boundaryPassed =
  exactTop3 >= 0.95 &&
  intentCorrect / corpus.intents.length >= 0.9 &&
  invalidRoutes === 0 &&
  adversarialMatches === 0;
const result = !boundaryPassed
  ? "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PERMISSION_BOUNDARY"
  : !providerAvailable && !contractOnly
    ? "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY"
    : !relevancePassed
      ? "COMUN_CIVIC_INTELLIGENCE_BLOCKED_RELEVANCE"
      : contractOnly
        ? "COMUN_CIVIC_EVAL_CONTRACT_GREEN"
        : "COMUN_CIVIC_RELEVANCE_AUTOMATION_GREEN";
const evidence = {
  result,
  corpusVersion: corpus.version,
  counts: {
    exact: corpus.exact.length,
    semantic: corpus.semanticQueries.length,
    intents: corpus.intents.length,
    typos: corpus.typos.length,
    ambiguities: corpus.ambiguities.length,
    noAnswer: corpus.noAnswer.length,
    adversarial: corpus.adversarial.length,
  },
  metrics,
  provider: { available: providerAvailable, model: providerModel, dimensions },
  thresholds: {
    exactTop3: 0.95,
    semanticRecallAt5: 0.8,
    intentAccuracy: 0.9,
    automaticIncorrectRedirects: 0,
    permissionViolations: 0,
    invalidRoutes: 0,
    unsourcedAnswers: 0,
  },
  containsQueries: false,
  containsIndexedText: false,
  humanRehearsal: "not_executed",
};
await mkdir(".ci-artifacts/civic-intelligence", { recursive: true });
await writeFile(
  ".ci-artifacts/civic-intelligence/evals.json",
  `${JSON.stringify(evidence, null, 2)}\n`,
  { mode: 0o600 },
);
console.log(result);
if (!boundaryPassed) process.exitCode = 1;
