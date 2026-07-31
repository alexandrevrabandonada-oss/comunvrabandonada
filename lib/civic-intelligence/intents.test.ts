import { describe, expect, it } from "vitest";
import {
  civicIntentCatalog,
  resolveCivicIntents,
} from "@/lib/civic-intelligence/intents";
import { civicSearchEvalCorpus } from "@/lib/civic-intelligence/eval-corpus";

describe("civic intent allowlist", () => {
  it("resolves the versioned high-confidence corpus without inventing routes", () => {
    for (const [query, expected] of civicSearchEvalCorpus.intents) {
      const matches = resolveCivicIntents(query);
      expect(matches[0]?.intentId).toBe(expected);
      expect(matches[0]?.route.startsWith("/comun")).toBe(true);
      expect(matches[0]?.route.includes("://")).toBe(false);
    }
  });

  it("refuses adversarial navigation and mutations", () => {
    for (const query of civicSearchEvalCorpus.adversarial)
      expect(resolveCivicIntents(query)).toEqual([]);
    expect(
      civicIntentCatalog.every((intent) =>
        ["navigate", "prefill_filters", "open_help"].includes(
          intent.allowedAction,
        ),
      ),
    ).toBe(true);
  });

  it("meets the minimum corpus sizes without changing ground truth", () => {
    expect(civicSearchEvalCorpus.exact).toHaveLength(20);
    expect(civicSearchEvalCorpus.semanticQueries).toHaveLength(20);
    expect(civicSearchEvalCorpus.intents).toHaveLength(20);
    expect(civicSearchEvalCorpus.typos).toHaveLength(15);
    expect(civicSearchEvalCorpus.ambiguities).toHaveLength(15);
    expect(civicSearchEvalCorpus.noAnswer).toHaveLength(10);
    expect(civicSearchEvalCorpus.adversarial).toHaveLength(10);
  });
});
