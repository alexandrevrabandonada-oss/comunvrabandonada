import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCivicSearchRateLimit } from "@/lib/rate-limit";
import { readPublicSearch } from "@/lib/civic-intelligence/public-search-read";
import { normalizeSearchState } from "@/lib/public-search-context";
import { recordCivicSearchMetric } from "@/lib/civic-intelligence/observability";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  q: z.string().trim().min(2).max(120),
  tipo: z.string().trim().max(40).optional(),
  pauta: z.string().max(120).optional(),
  territorio: z.string().max(120).optional(),
  semantic: z.enum(["1", "0"]).default("1"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = inputSchema.safeParse(Object.fromEntries(url.searchParams));
  const state = parsed.success ? normalizeSearchState(parsed.data) : null;
  if (!parsed.success || !state) {
    return NextResponse.json({ code: "invalid_query" }, { status: 400 });
  }
  const limit = await checkCivicSearchRateLimit();
  if (!limit.allowed) {
    await recordCivicSearchMetric({
      searchKind: "lexical",
      outcome: "fallback",
      queryLength: parsed.data.q.length,
      durationMs: 0,
    });
    return NextResponse.json(
      { code: "rate_limited", fallbackPreserved: true },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }
  try {
    const result = await readPublicSearch(state, parsed.data.semantic === "1");
    await recordCivicSearchMetric({
      searchKind: result.intents.length
        ? "intent"
        : result.semanticState === "ready"
          ? "hybrid"
          : "lexical",
      outcome:
        result.semanticState === "timeout"
          ? "timeout"
          : result.semanticState === "unavailable"
            ? "fallback"
            : result.results.length
              ? "results"
              : "zero_results",
      queryLength: parsed.data.q.length,
      durationMs: result.durationMs,
      confidenceBand: result.intents[0]?.confidenceBand ?? "none",
      modelVersion:
        result.semanticState === "ready" ? "gte-small@native-v1" : "lexical",
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    await recordCivicSearchMetric({
      searchKind: "lexical",
      outcome: "error",
      queryLength: parsed.data.q.length,
      durationMs: 0,
    });
    return NextResponse.json(
      { code: "enrichment_unavailable", fallbackPreserved: true },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
