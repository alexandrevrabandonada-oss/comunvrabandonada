import { readFile } from "node:fs/promises";
import { assertLocalEnvironment } from "./local-environment.mjs";

assertLocalEnvironment();
const [registry, page, migration] = await Promise.all([
  readFile("lib/comun/pauta-module-registry.ts", "utf8"),
  readFile("app/comun/pautas/[slug]/page.tsx", "utf8"),
  readFile("supabase/migrations/20260715032613_comun_pauta_miniapps_circles.sql", "utf8"),
]);
for (const moduleType of ["overview", "construction_circle", "map", "archive", "community_radio_future"]) if (!registry.includes(`'${moduleType}'`)) throw new Error(`catálogo sem ${moduleType}`);
if (!page.includes("PautaAppShell") || !page.includes("LegacyIssuePage")) throw new Error("fallback modular ausente");
for (const table of ["comun_pauta_modules", "comun_construction_circles", "comun_circle_contributions", "comun_circle_syntheses", "comun_member_profiles"]) if (!migration.includes(table)) throw new Error(`migration sem ${table}`);
if (!migration.includes("enable row level security") || !migration.includes("revoke all")) throw new Error("RLS/grants explícitos ausentes");
console.log("smoke:pauta-miniapp local ok");
