import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type CivicMemoryItem = {
  question:
    | "what_changed"
    | "what_happened_after"
    | "what_is_missing"
    | "what_was_tried"
    | "which_processes_had_results";
  label: string;
  title: string;
  state: string | null;
  date: string | null;
  route: string;
  sourceType: string;
};

export async function getStructuredCivicMemory(
  pautaId: string,
): Promise<CivicMemoryItem[]> {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(pautaId)) return [];
  const { data, error } = await supabase
    .from("comun_search_documents")
    .select("source_type,title,process_state,source_date,canonical_route")
    .eq("permission_scope", "public")
    .eq("pauta_id", pautaId)
    .in("source_type", ["ação", "resultado", "memória", "documento"])
    .order("source_date", { ascending: false })
    .limit(12);
  if (error) return [];
  return (data ?? []).map((row) => {
    const sourceType = String(row.source_type);
    const question =
      sourceType === "resultado"
        ? "which_processes_had_results"
        : sourceType === "ação"
          ? "what_was_tried"
          : sourceType === "memória"
            ? "what_happened_after"
            : "what_changed";
    const label =
      question === "which_processes_had_results"
        ? "Processo com resultado"
        : question === "what_was_tried"
          ? "O que já tentamos"
          : question === "what_happened_after"
            ? "O que aconteceu depois"
            : "O que mudou";
    return {
      question,
      label,
      title: String(row.title),
      state: row.process_state ? String(row.process_state) : null,
      date: row.source_date ? String(row.source_date) : null,
      route: String(row.canonical_route),
      sourceType,
    };
  });
}
