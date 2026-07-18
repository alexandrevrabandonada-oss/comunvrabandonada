import { randomUUID } from "node:crypto";
import { assertLocalEnvironment } from "../../../scripts/local-environment.mjs";
import { OPERATION_QUEUES } from "../../../lib/editorial-operation.ts";
import { localServiceClient } from "./local-fixtures.mjs";
import { createOperationalPersonas, operationalEmail } from "./operational-personas.mjs";

const prefix = "fixture-s33-2-perf-";
const states = ["pending", "assigned", "in_review", "blocked", "ready", "published", "resolved", "withdrawn"];

function assertCount(itemCount) {
  if (!Number.isInteger(itemCount) || itemCount < 0 || itemCount > 100) throw new Error("itemCount deve ser inteiro entre 0 e 100");
}

async function required(data, label) {
  if (data.error) throw new Error(`${label}: ${data.error.message}`);
  return data.data;
}

export async function createOperationalPerformanceScenario({ runId = randomUUID(), itemCount, queue = "all", status = "mixed", territoryCount = 0, personas } = {}) {
  assertLocalEnvironment();
  assertCount(itemCount);
  if (!Number.isInteger(territoryCount) || territoryCount < 0) throw new Error("territoryCount inválido");
  const db = localServiceClient();
  const tag = `${prefix}${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const slug = `${tag}-pauta`;
  await cleanupOperationalPerformanceScenario({ runId });
  const activePersonas = personas ?? await createOperationalPersonas();
  const { data: pauta, error: pautaError } = await db.from("comun_pauta_spaces").insert({ slug, title: `Carga editorial ${itemCount}`, summary: "Fixture local de performance.", visibility: "public", public_synthesis: "Fixture local sem publicação real.", next_step: "Limpar fixture." }).select("id").single();
  if (pautaError || !pauta) throw new Error(pautaError?.message ?? "pauta de performance ausente");
  const profileRows = await required(await db.from("comun_admin_profiles").select("id,email").in("email", [operationalEmail("operations_admin"), operationalEmail("contribution_reviewer")]), "perfis de performance");
  const adminProfile = profileRows.find((profile) => profile.email === operationalEmail("operations_admin"));
  const reviewerProfile = profileRows.find((profile) => profile.email === operationalEmail("contribution_reviewer"));
  if (!adminProfile || !reviewerProfile) throw new Error("perfis de performance ausentes");
  const items = Array.from({ length: itemCount }, (_, index) => ({
    source_type: "contribution",
    pauta_id: pauta.id,
    queue: queue === "all" ? OPERATION_QUEUES[index % OPERATION_QUEUES.length] : queue,
    state: status === "mixed" ? states[index % states.length] : status,
    title: `Carga ${runId} item ${String(index + 1).padStart(3, "0")}`,
    public_reason: "Fixture local sanitizada.",
    next_action: "Revisar fixture.",
    priority: (index % 4) + 1,
    human_gate: "Revisão humana fixture",
    fixture_tag: tag,
  }));
  const inserted = items.length ? await required(await db.from("comun_editorial_operation_items").insert(items).select("id,queue,state,title"), "itens de performance") : [];
  if (inserted.length !== itemCount) throw new Error(`itens inseridos divergentes: ${inserted.length}/${itemCount}`);
  if (inserted.length) {
    await required(await db.from("comun_editorial_operation_assignments").insert(inserted.map((item, index) => ({ item_id: item.id, assignee_profile_id: index % 2 ? reviewerProfile.id : adminProfile.id, assigned_by_profile_id: adminProfile.id, role_at_assignment: index % 2 ? "editorial_reviewer" : "admin", status: "active" }))), "atribuições de performance");
    await required(await db.from("comun_editorial_operation_events").insert(inserted.flatMap((item, index) => [
      { item_id: item.id, actor_profile_id: adminProfile.id, event_type: "fixture_created", payload: { index, run_id: runId } },
      { item_id: item.id, actor_profile_id: reviewerProfile.id, event_type: "fixture_assigned", payload: { queue: item.queue } },
    ])), "eventos de performance");
  }
  const { count, error: countError } = await db.from("comun_editorial_operation_items").select("id", { count: "exact", head: true }).eq("fixture_tag", tag);
  if (countError || count !== itemCount) throw new Error(`contagem SQL divergente: ${count ?? "erro"}/${itemCount}`);
  return { runId, tag, pautaId: pauta.id, itemCount, inserted, personas: activePersonas.map(({ persona, email }) => ({ persona, email })), territoryCount };
}

export async function cleanupOperationalPerformanceScenario({ runId }) {
  if (!runId) return;
  assertLocalEnvironment();
  const db = localServiceClient();
  const tag = `${prefix}${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const { data: pautas } = await db.from("comun_pauta_spaces").select("id").like("slug", `${tag}%`);
  await required(await db.from("comun_editorial_operation_items").delete().eq("fixture_tag", tag), "cleanup itens de performance");
  for (const pauta of pautas ?? []) await required(await db.from("comun_pauta_spaces").delete().eq("id", pauta.id), "cleanup pauta de performance");
  const { count, error } = await db.from("comun_editorial_operation_items").select("id", { count: "exact", head: true }).eq("fixture_tag", tag);
  if (error || count) throw new Error(`cleanup de performance incompleto: ${count ?? "erro"}`);
}
