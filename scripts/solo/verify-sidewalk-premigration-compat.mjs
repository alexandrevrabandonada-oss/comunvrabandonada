import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const guardedActions = [
  "app/comun/mapa/contribuir/actions.ts",
  "app/comun/admin/calcadas/actions.ts",
  "app/comun/admin/calcadas/prioridade/actions.ts",
  "app/comun/admin/calcadas/encaminhamentos/actions.ts",
  "app/comun/calcadas/registros/[slug]/actions.ts",
];
const gatedPages = [
  "app/comun/mapa/contribuir/page.tsx",
  "app/comun/mapa/contribuir/confirmacao/page.tsx",
  "app/comun/admin/calcadas/page.tsx",
  "app/comun/admin/calcadas/prioridade/page.tsx",
  "app/comun/admin/calcadas/encaminhamentos/[id]/page.tsx",
  "app/comun/calcadas/registros/[slug]/page.tsx",
];
const newObjects = /confirmation_state|confirmation_locked_at|confirmation_attempts|failure_kind|complement_request_private|complement_field_private|complement_due_at|comun_sidewalk_duplicate_suggestions/;

if (process.env.COMUN_SIDEWALK_OPERATIONAL_V2 === "enabled") {
  throw new Error("COMUN_SIDEWALK_PREMIGRATION_COMPAT_REQUIRES_DISABLED_FLAG");
}

for (const file of guardedActions) {
  const source = await readFile(resolve(root, file), "utf8");
  const guard = source.indexOf("await requireSidewalkOperationalRelease()");
  const firstNewObject = source.search(newObjects);
  if (guard < 0 || (firstNewObject >= 0 && guard > firstNewObject)) {
    throw new Error(`COMUN_SIDEWALK_PREMIGRATION_UNGUARDED_ACTION:${file}`);
  }
}

for (const file of gatedPages) {
  const source = await readFile(resolve(root, file), "utf8");
  if (!source.includes("getSidewalkOperationalRelease") || !source.includes("SIDEWALK_OPERATIONAL_PAUSED_MESSAGE")) {
    throw new Error(`COMUN_SIDEWALK_PREMIGRATION_UNGUARDED_PAGE:${file}`);
  }
}

console.log("COMUN_SIDEWALK_PREMIGRATION_COMPAT_GREEN");
