import "server-only";
import { createServiceSupabaseClient } from "./supabase/server";
import { resolveCurrentPublicEvidenceReference } from "./comun-public-evidence-resolver";

export async function attachPublicEvidenceToPauta(input: {
  pautaId: string;
  refId: string;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("COMUN_PUBLIC_EVIDENCE_SERVICE_UNAVAILABLE");
  const { data: pauta, error: pautaError } = await supabase
    .from("comun_pauta_spaces")
    .select("id")
    .eq("id", input.pautaId)
    .eq("visibility", "public")
    .neq("status", "archived")
    .maybeSingle();
  if (pautaError || !pauta) throw new Error("COMUN_PUBLIC_EVIDENCE_PAUTA_NOT_PUBLIC");

  const citation = await resolveCurrentPublicEvidenceReference(input.refId);
  if (!citation) throw new Error("COMUN_PUBLIC_EVIDENCE_REFERENCE_NOT_FOUND");

  const select = "id, pauta_id, public_evidence_ref_id, public_evidence_version, public_evidence_payload";
  const existing = await supabase
    .from("comun_pauta_evidence_items")
    .select(select)
    .eq("pauta_id", input.pautaId)
    .eq("source_type", "public_evidence")
    .eq("public_evidence_ref_id", citation.refId)
    .eq("public_evidence_version", citation.versionId)
    .maybeSingle();
  if (existing.data) return { created: false as const, evidence: existing.data };

  const inserted = await supabase
    .from("comun_pauta_evidence_items")
    .insert({
      pauta_id: input.pautaId,
      source_type: "public_evidence",
      source_id: null,
      title: citation.title,
      summary: citation.referencePeriod,
      evidence_type: "dado_agregado",
      sensitivity: "public_safe",
      status: "approved",
      public_note: citation.limitations[0] ?? null,
      internal_note: null,
      public_evidence_ref_id: citation.refId,
      public_evidence_version: citation.versionId,
      public_evidence_payload: citation,
    } as never)
    .select(select)
    .single();
  if (!inserted.error && inserted.data)
    return { created: true as const, evidence: inserted.data };
  if (inserted.error?.code === "23505") {
    const raced = await supabase
      .from("comun_pauta_evidence_items")
      .select(select)
      .eq("pauta_id", input.pautaId)
      .eq("source_type", "public_evidence")
      .eq("public_evidence_ref_id", citation.refId)
      .eq("public_evidence_version", citation.versionId)
      .single();
    if (raced.data) return { created: false as const, evidence: raced.data };
  }
  throw new Error("COMUN_PUBLIC_EVIDENCE_ATTACH_FAILED");
}
