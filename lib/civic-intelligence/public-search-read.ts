import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { hybridPublicSearch } from "./search";
import { unifiedPublicSearch } from "@/lib/unified-search";
import {
  safeSearchResults,
  type PublicSearchState,
  type SearchAvailability,
} from "@/lib/public-search-context";
export async function resolvePublicSearchFilter(
  kind: "pauta" | "territorio",
  value: string,
) {
  const db = createServiceSupabaseClient();
  if (!db) throw Error("SEARCH_FILTER_UNAVAILABLE");
  let q = db
    .from(kind === "pauta" ? "comun_pauta_spaces" : "comun_hub_territories")
    .select("id,slug")
    .eq("visibility", "public");
  if (kind === "territorio") q = q.neq("status", "archived");
  q = q.eq(/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(value) ? "id" : "slug", value);
  const { data, error } = await q.maybeSingle();
  if (error) throw Error("SEARCH_FILTER_UNAVAILABLE");
  return data as { id: string; slug: string } | null;
}
export async function readPublicSearch(
  state: PublicSearchState,
  semantic = false,
) {
  const filters: { pautaId?: string; territoryId?: string } = {};
  try {
    for (const k of ["pauta", "territorio"] as const)
      if (state[k]) {
        const resolved = await resolvePublicSearchFilter(k, state[k]!);
        if (!resolved)
          return {
            results: [],
            availability: "empty" as SearchAvailability,
            intents: [],
            semanticState: "disabled",
            durationMs: 0,
          };
        filters[k === "pauta" ? "pautaId" : "territoryId"] = resolved.id;
      }
    const response = await hybridPublicSearch({
      query: state.q,
      type: state.tipo,
      ...filters,
      semantic,
    });
    // A missing client is not a successful empty query.
    if (
      response.semanticState === "unavailable" &&
      !createServiceSupabaseClient()
    )
      throw Error("SEARCH_UNAVAILABLE");
    const results = safeSearchResults(response.results);
    return {
      ...response,
      results,
      availability: (results.length ? "ready" : "empty") as SearchAvailability,
    };
  } catch {
    // Legacy lexical fallback cannot enforce contextual SQL filters. Never broaden them.
    if (state.pauta || state.territorio)
      return {
        results: [],
        availability: "unavailable" as SearchAvailability,
        intents: [],
        semanticState: "unavailable",
        durationMs: 0,
      };
    try {
      const response = await unifiedPublicSearch(state.q, { type: state.tipo });
      return {
        ...response,
        results: safeSearchResults(response.results),
        availability: (response.availability ?? "empty") as SearchAvailability,
        intents: [],
        semanticState: "unavailable",
      };
    } catch {
      return {
        results: [],
        availability: "unavailable" as SearchAvailability,
        intents: [],
        semanticState: "unavailable",
        durationMs: 0,
      };
    }
  }
}
