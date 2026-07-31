import "server-only";
import { performance } from "node:perf_hooks";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { SearchResult } from "@/lib/unified-search";
import { SupabaseNativeEmbeddingProvider } from "@/lib/civic-intelligence/providers";
import { resolveCivicIntents } from "@/lib/civic-intelligence/intents";

export type CivicSearchResponse = {
  results: Array<SearchResult & { matchReason?: string }>;
  intents: ReturnType<typeof resolveCivicIntents>;
  durationMs: number;
  semanticState: "ready" | "disabled" | "unavailable" | "timeout";
};

const vectorLiteral = (vector: number[]) => `[${vector.join(",")}]`;

export async function hybridPublicSearch(input: {
  query: string;
  type?: string;
  pautaId?: string;
  territoryId?: string;
  semantic?: boolean;
  timeoutMs?: number;
}): Promise<CivicSearchResponse> {
  const started = performance.now();
  const query = input.query.trim().slice(0, 120);
  const intents = resolveCivicIntents(query);
  if (query.length < 2)
    return { results: [], intents, durationMs: 0, semanticState: "disabled" };
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    return {
      results: [],
      intents,
      durationMs: 0,
      semanticState: "unavailable",
    };

  let embedding: string | null = null;
  let semanticState: CivicSearchResponse["semanticState"] =
    input.semantic === false ? "disabled" : "unavailable";
  if (input.semantic !== false) {
    try {
      const provider = new SupabaseNativeEmbeddingProvider();
      const timeoutMs = Math.min(Math.max(input.timeoutMs ?? 1800, 200), 2500);
      const vector = await Promise.race([
        provider.embedQuery(query),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("COMUN_SEMANTIC_TIMEOUT")),
            timeoutMs,
          ),
        ),
      ]);
      embedding = vectorLiteral(vector);
      semanticState = "ready";
    } catch (error) {
      semanticState =
        error instanceof Error && error.message.includes("TIMEOUT")
          ? "timeout"
          : "unavailable";
    }
  }

  const { data, error } = await supabase.rpc("comun_public_search_hybrid", {
    p_query: query,
    p_type: input.type || null,
    p_pauta_id: input.pautaId || null,
    p_territory_id: input.territoryId || null,
    p_query_embedding: embedding,
    p_limit: 50,
  });
  if (error) throw new Error("COMUN_HYBRID_SEARCH_UNAVAILABLE");
  return {
    results: (data ?? []).map((row: Record<string, unknown>) => ({
      type: String(row.type),
      title: String(row.title),
      summary: row.summary ? String(row.summary) : null,
      href: String(row.href),
      origin: String(row.origin),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
      score: 0,
      matchReason: row.match_reason ? String(row.match_reason) : undefined,
    })),
    intents,
    durationMs: Math.round(performance.now() - started),
    semanticState,
  };
}
