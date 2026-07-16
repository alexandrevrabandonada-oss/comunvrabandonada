import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

export default async function globalTeardown() {
  const slugFile = path.join(process.cwd(), ".comun-sidewalk-pilot-slug");
  if (!fs.existsSync(slugFile)) {
    console.log("COMUN_TEST_FIXTURES_CLEAN");
    return;
  }

  const { pautaId } = JSON.parse(fs.readFileSync(slugFile, "utf8"));
  const raw = execFileSync("powershell", ["-NoProfile", "-Command", "$env:DO_NOT_TRACK='1'; npx supabase status -o env"], { encoding: "utf8" });
  const env = Object.fromEntries(raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const i = line.indexOf("=");
    return [line.slice(0, i), line.slice(i + 1).replace(/^\"|\"$/g, "")];
  }));

  const db = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await db.from("comun_pauta_modules").delete().eq("pauta_id", pautaId);
  await db.from("comun_pauta_spaces").delete().eq("id", pautaId);
  fs.unlinkSync(slugFile);
  console.log("COMUN_TEST_FIXTURES_CLEAN");
}
