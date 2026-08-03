import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const directory = "supabase/migrations";
const marker = "20260722003105";
const files = (await readdir(directory))
  .filter((name) => name.endsWith(".sql") && name.slice(0, 14) > marker)
  .sort();
const failures = [];

for (const file of files) {
  const sql = (await readFile(path.join(directory, file), "utf8"))
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi)) {
    const relation = match[1];
    const [schema] = relation.includes(".") ? relation.split(".") : ["public"];
    if (!new RegExp(`alter\\s+table\\s+${relation.replace(".", "\\.")}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql)) {
      failures.push(`${file}:${relation}:RLS_REQUIRED`);
    }
    const directRevoke = new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+table\\s+${relation.replace(".", "\\.")}[\\s\\S]*?from\\s+public,\\s*anon,\\s*authenticated`, "i").test(sql);
    const schemaRevoke = new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+all\\s+tables\\s+in\\s+schema\\s+${schema}[\\s\\S]*?from\\s+public,\\s*anon,\\s*authenticated`, "i").test(sql);
    if (!directRevoke && !schemaRevoke) {
      failures.push(`${file}:${relation}:EXPLICIT_REVOKE_REQUIRED`);
    }
  }

  for (const match of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+([\w.]+)/gi)) {
    const relation = match[1];
    if (!new RegExp(`revoke\\s+all(?:\\s+privileges)?\\s+on\\s+(?:table\\s+)?${relation.replace(".", "\\.")}`, "i").test(sql)) {
      failures.push(`${file}:${relation}:VIEW_REVOKE_REQUIRED`);
    }
  }

  if (/security\s+definer/i.test(sql)) {
    if (!/search_path\s*(?:=|to)\s*(?:'pg_catalog'|pg_catalog)/i.test(sql)) {
      failures.push(`${file}:SECURITY_DEFINER_SEARCH_PATH_REQUIRED`);
    }
    if (!/revoke\s+all[\s\S]*?on\s+function[\s\S]*?from\s+public(?:\s*,\s*anon\s*,\s*authenticated)?/i.test(sql)) {
      failures.push(`${file}:SECURITY_DEFINER_REVOKE_REQUIRED`);
    }
    if (/grant\s+execute[\s\S]*?on\s+function[\s\S]*?to\s+(?:anon|authenticated)\b/i.test(sql)) {
      failures.push(`${file}:SECURITY_DEFINER_CLIENT_EXECUTE_FORBIDDEN`);
    }
  }
}

if (failures.length) {
  console.error("COMUN_EXPLICIT_PRIVILEGE_CONTRACT_FAILED");
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log(`COMUN_EXPLICIT_PRIVILEGE_CONTRACT_OK migrations=${files.length}`);
