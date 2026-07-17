import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertLocalEnvironment } from "../../scripts/local-environment.mjs";

export default async function globalSetup() {
  assertLocalEnvironment();

  const slugFile = path.join(process.cwd(), ".comun-sidewalk-pilot-slug");
  const raw = execFileSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; npx supabase status -o env"], { encoding: "utf8" });
  const env = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const i = line.indexOf("=");
    return [line.slice(0, i), line.slice(i + 1).replace(/^\"|\"$/g, "")];
  }));

  const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const tag = `e2e-sidewalk-${crypto.randomUUID().slice(0, 8)}`;
  const slug = `${tag}-pauta`;

  const { data: pauta, error } = await db.from("comun_pauta_spaces").insert({
    slug,
    title: `Mapa Popular das Calçadas — ${tag}`,
    summary: "Fixture E2E local do piloto de calçadas.",
    status: "organizing",
    visibility: "public",
    public_synthesis: "Diagnóstico comunitário em construção.",
    next_step: "Revisar contribuições e publicar síntese.",
  }).select("id").single();

  if (error) throw error;

  const modules = ["overview", "reports", "map", "observatory", "construction_circle", "proposals", "actions", "tasks", "results", "art_gallery", "community_radio", "archive", "participation"];
  const insertModules = await db.from("comun_pauta_modules").insert(modules.map((moduleType, position) => ({
    pauta_id: pauta.id,
    module_type: moduleType,
    position,
    status: "active",
    visibility: "public",
    config: moduleType === "map" ? { contributionEnabled: true, defaultView: "list", layerIds: [], territoryIds: [] } : {},
  })));
  if (insertModules.error) throw insertModules.error;

  const { data: layer } = await db.from("comun_territorial_layers").select("id").eq("slug", "sidewalk_accessibility").single();

  const { data: territory } = await db.from("comun_hub_territories").insert({
    slug: `${tag}-territorio`,
    name: `Território E2E ${tag}`,
    territory_type: "neighborhood",
    municipality: "Volta Redonda",
    public_summary: "Território sintético para testes E2E do piloto de calçadas.",
    status: "active",
    visibility: "public",
    verification_status: "verified",
    latitude: -22.52,
    longitude: -44.10,
    geometry_type: "point",
    geometry_geojson: { type: "Point", coordinates: [-44.10, -22.52] },
    location_precision: "approximate",
    pauta_id: pauta.id,
  }).select("id").single();

  await db.from("comun_territory_layers").insert({ territory_id: territory.id, layer_id: layer.id });

  const { data: recordLine } = await db.from("comun_sidewalk_records").insert({
    pauta_id: pauta.id,
    territory_id: territory.id,
    slug: `${tag}-trecho`,
    name: "Trecho de calçada quebrada — E2E",
    geometry_geojson: { type: "LineString", coordinates: [[-44.102, -22.522], [-44.103, -22.523], [-44.104, -22.524]] },
    categories: ["buraco", "calcada_irregular"],
    impact_level: "critical",
    affected_groups: ["wheelchair_users", "children"],
    status: "published",
    verification_status: "verified",
    visibility: "public",
    public_summary: "Trecho de calçada com irregularidades no teste E2E.",
    public_location_level: "approximate",
    approximate_location: "Trecho entre esquinas do território E2E",
  }).select("id, slug").single();

  const { data: memory } = await db.from("comun_sidewalk_cycle_memories").insert({
    pauta_id: pauta.id,
    record_id: recordLine.id,
    slug: `${tag}-memoria`,
    title: "O que aprendemos sobre as calçadas neste ciclo de teste?",
    public_summary: "Memória E2E do ciclo de calçadas, relacionando registros e território.",
    status: "published",
    visibility: "public",
    published_at: new Date().toISOString(),
  }).select("id, slug").single();

  const { data: circle } = await db.from("comun_construction_circles").insert({
    pauta_id: pauta.id,
    module_id: null,
    title: "Roda de construção do Mapa Popular das Calçadas — E2E",
    public_question: "O que precisamos entender sobre as calçadas deste território?",
    public_context: "Rodada fixture para testes E2E do piloto de calçadas.",
    status: "open",
    participation_mode: "moderated_public",
  }).select("id").single();

  const { data: round } = await db.from("comun_construction_circle_rounds").insert({
    circle_id: circle.id,
    round_type: "evidence_gathering",
    title: "O que observamos nas calçadas?",
    public_prompt: "Descreva uma situação de calçada que afete a circulação no território.",
    public_guidance: "Não envie dados pessoais, endereços completos ou placas de veículos.",
    position: 0,
    status: "open",
  }).select("id").single();

  await db.from("comun_construction_circles").update({ current_round_id: round.id }).eq("id", circle.id);

  fs.writeFileSync(slugFile, JSON.stringify({ slug, pautaId: pauta.id, territoryId: territory.id, recordId: recordLine.id, memoryId: memory.id, recordSlug: recordLine.slug, memorySlug: memory.slug, circleId: circle.id, roundId: round.id, tag }), "utf8");
  process.env.COMUN_SIDEWALK_PILOT_SLUG = slug;
}
