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

  const modules = ["overview", "reports", "map", "observatory", "construction_circle", "participation"];
  const insertModules = await db.from("comun_pauta_modules").insert(modules.map((moduleType, position) => ({
    pauta_id: pauta.id,
    module_type: moduleType,
    position,
    status: "active",
    visibility: "public",
    config: moduleType === "map" ? { contributionEnabled: true, defaultView: "list", layerIds: [], territoryIds: [] } : {},
  })));
  if (insertModules.error) throw insertModules.error;

  fs.writeFileSync(slugFile, JSON.stringify({ slug, pautaId: pauta.id, tag }), "utf8");
  process.env.COMUN_SIDEWALK_PILOT_SLUG = slug;
}
