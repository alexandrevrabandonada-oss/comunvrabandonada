import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url ?? ""))
  throw new Error("Supabase local obrigatório.");
if (!anonKey || !serviceKey) throw new Error("Credenciais locais ausentes.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } }),
  anon = createClient(url, anonKey, { auth: { persistSession: false } }),
  stamp = `runtime-${randomUUID().slice(0, 8)}`;
let firstId, secondId, duplicateRecordId, duplicateCandidateId;

try {
  const pauta = await service.from("comun_pauta_spaces").select("id").eq("slug", "calcadas-em-circulacao").single();
  assert.equal(pauta.error, null, pauta.error?.message);
  const payload = {
    pauta_id: pauta.data.id,
    slug: `${stamp}-a`,
    name: "Registro sintético para smoke",
    categories: ["irregular"], impact_level: "medium", affected_groups: ["general_public"],
    status: "under_review", verification_status: "community_report", visibility: "internal",
    public_summary: null, private_notes: "RUNTIME-PRIVATE-SENSITIVE: telefone 21999999999",
    private_geometry_geojson: { type: "Point", coordinates: [-44.10421, -22.52021] },
    public_geometry_geojson: null, public_location_level: "approximate", approximate_location: "Trecho sintético",
    municipality: "Volta Redonda", condition: "regular", location_source: "manual", location_precision: "exact",
  };
  const created = await service.from("comun_sidewalk_records").insert(payload).select("id").single();
  assert.equal(created.error, null, created.error?.message); firstId = created.data.id;
  const second = await service.from("comun_sidewalk_records").insert({ ...payload, slug: `${stamp}-b`, private_notes: "RUNTIME-PRIVATE-SECOND" }).select("id").single();
  assert.equal(second.error, null, second.error?.message); secondId = second.data.id;

  const internal = await service.from("comun_sidewalk_records").select("private_notes,public_summary").eq("id", firstId).single();
  assert.equal(internal.data.private_notes.includes("RUNTIME-PRIVATE-SENSITIVE"), true);
  assert.equal(internal.data.public_summary, null);

  [duplicateRecordId, duplicateCandidateId] = [firstId, secondId].sort();
  const suggestion = await service.from("comun_sidewalk_duplicate_suggestions").insert({ record_id: duplicateRecordId, candidate_record_id: duplicateCandidateId, score: 60, signals: ["proximidade_territorial", "mesma_categoria"], decision: "possible_duplicate" });
  assert.equal(suggestion.error, null, suggestion.error?.message);
  const decision = await service.from("comun_sidewalk_duplicate_suggestions").update({ decision: "distinct", decided_at: new Date().toISOString() }).eq("record_id", duplicateRecordId).eq("candidate_record_id", duplicateCandidateId);
  assert.equal(decision.error, null, decision.error?.message);

  const published = await service.from("comun_sidewalk_records").update({ public_summary: "Resumo público sanitizado de fixture.", public_geometry_geojson: { type: "Point", coordinates: [-44.104, -22.52] }, location_precision: "approximate", visibility: "public", status: "published", verification_status: "verified" }).eq("id", firstId);
  assert.equal(published.error, null, published.error?.message);
  const publicRow = await anon.from("comun_sidewalk_records").select("*").eq("id", firstId).maybeSingle();
  assert.equal(publicRow.data, null);
  assert.equal(publicRow.error?.code, "42501", "anon não pode consultar a tabela operacional");
  console.log("COMUN_CALCADAS_OPERATIONAL_RUNTIME_OK");
} finally {
  if (duplicateRecordId && duplicateCandidateId)
    await service.from("comun_sidewalk_duplicate_suggestions").delete().eq("record_id", duplicateRecordId).eq("candidate_record_id", duplicateCandidateId);
  if (firstId || secondId) await service.from("comun_sidewalk_records").delete().in("id", [firstId, secondId].filter(Boolean));
}
