import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];
const outputDir = process.argv[3] ?? "supabase/reconciliation/pr23/modules";
if (!input) throw new Error("usage: node scripts/generate-pr23-reconciliation.mjs <diff.sql> [output-dir]");

function splitSql(source) {
  const statements = [];
  let current = "";
  let quote = null;
  let dollar = null;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    current += ch;
    if (dollar) {
      if (source.startsWith(dollar, i)) {
        current += source.slice(i + 1, i + dollar.length);
        i += dollar.length - 1;
        dollar = null;
      }
      continue;
    }
    if (quote) {
      if (ch === quote && next === quote) {
        current += next;
        i += 1;
      } else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === "$") {
      const match = source.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollar = match[0];
        current += dollar.slice(1);
        i += dollar.length - 1;
        continue;
      }
    }
    if (ch === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

const legacy = /(public\.)?(comments|communities|knowledge_pages|posts|profiles|project_links|reactions_as_actions)\b/i;
const destructive = /^DROP\s+(TABLE|SCHEMA)\b/i;
const preserveRemote = /^DROP\s+(FUNCTION\s+public\.(handle_new_user|handle_updated_at)|TRIGGER\b|POLICY\b)/i;

function moduleFor(sql) {
  if (/sidewalk/i.test(sql)) return "08-sidewalks.sql";
  if (/community|communities/i.test(sql) && !legacy.test(sql)) return "06-communities.sql";
  if (/archive_art|artwork|radio_/i.test(sql)) return "05-art-radio.sql";
  if (/member_profile|member_inbox/i.test(sql)) return "04-member-profiles-inbox.sql";
  if (/pauta|circle/i.test(sql)) return "03-pautas-circles.sql";
  if (/editorial|operational|admin_profile/i.test(sql)) return "07-editorial-operation.sql";
  if (/REVOKE|GRANT|DEFAULT PRIVILEGES/i.test(sql)) return "09-security-hardening.sql";
  return "02-foundations.sql";
}

const source = await readFile(input, "utf8");
const reviewBuckets = new Map([
  ["02-foundations.sql", []], ["03-pautas-circles.sql", []],
  ["04-member-profiles-inbox.sql", []], ["05-art-radio.sql", []],
  ["06-communities.sql", []], ["07-editorial-operation.sql", []],
  ["08-sidewalks.sql", []], ["09-security-hardening.sql", []],
]);

const rejected = [];
const unexpectedRejected = [];
for (const statement of splitSql(source)) {
  if (/^SET check_function_bodies/i.test(statement)) continue;
  if (destructive.test(statement)) {
    rejected.push(statement.split(/\s+/).slice(0, 5).join(" "));
    if (!legacy.test(statement)) unexpectedRejected.push(statement);
    continue;
  }
  if (preserveRemote.test(statement) && (legacy.test(statement) || /handle_new_user|handle_updated_at/i.test(statement))) {
    rejected.push(statement.split(/\s+/).slice(0, 8).join(" "));
    continue;
  }
  reviewBuckets.get(moduleFor(statement)).push(statement);
}

await mkdir(outputDir, { recursive: true });
const orderedStatements = [...reviewBuckets.values()].flatMap(() => []);
for (const statement of splitSql(source)) {
  if (/^SET check_function_bodies/i.test(statement)) continue;
  if (destructive.test(statement)) continue;
  if (preserveRemote.test(statement) && (legacy.test(statement) || /handle_new_user|handle_updated_at/i.test(statement))) continue;
  orderedStatements.push(`${statement};`);
}
await writeFile(path.join(outputDir, "02-foundations.sql"), `-- Delta forward-only em ordem topológica original.\n-- Não executar isoladamente; use run-pr23-reconciliation.mjs.\n\n${orderedStatements.join("\n\n")}\n`, "utf8");
for (const [name, statements] of reviewBuckets) {
  if (name === "02-foundations.sql") continue;
  const objects = [...new Set(statements.flatMap((sql) => sql.match(/public\.[a-zA-Z0-9_]+/g) ?? []))].sort();
  const header = `-- Índice revisável do domínio; DDL preservado em 02-foundations.sql para não quebrar dependências.\n-- Objetos auditados (${objects.length}):\n`;
  const hardening = name === "09-security-hardening.sql" ? `\n\n-- Remover privilégios auxiliares herdados dos default privileges legados,\n-- sem alterar SELECT/INSERT/UPDATE/DELETE definidos pela matriz canônica.\ndo $$\ndeclare target record;\nbegin\n  for target in select format('%I.%I', n.nspname, c.relname) as qualified_name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') loop\n    execute format('revoke maintain, references, trigger, truncate on table %s from anon, authenticated', target.qualified_name);\n  end loop;\nend $$;\n\nrevoke all privileges on table public.comun_sidewalk_uploads, public.comun_sidewalk_forwardings, public.comun_editorial_operation_items, public.comun_community_role_assignments from public, anon, authenticated;\ngrant select on table public.comun_sidewalk_uploads, public.comun_community_role_assignments to authenticated;\ngrant select, insert, update, delete, truncate, references, trigger on table public.comun_sidewalk_uploads, public.comun_sidewalk_forwardings, public.comun_editorial_operation_items, public.comun_community_role_assignments to service_role;\nrevoke all privileges on function public.set_updated_at(), public.set_comun_official_protocols_updated_at() from anon, authenticated, service_role;\n\n-- Drift remoto preservado temporariamente, mas não exposto.\ndo $$\nbegin\n  if to_regprocedure('public.handle_new_user()') is not null then\n    revoke all privileges on function public.handle_new_user() from public, anon, authenticated;\n    grant execute on function public.handle_new_user() to service_role;\n  end if;\nend $$;\n` : "\n";
  await writeFile(path.join(outputDir, name), header + objects.map((object) => `-- - ${object}`).join("\n") + hardening, "utf8");
}

await writeFile(path.join(outputDir, "generation-rejections.txt"), rejected.join("\n") + "\n", "utf8");
if (unexpectedRejected.length > 0) {
  throw new Error("unexpected destructive statement rejected; inspect generation-rejections.txt");
}
console.log(`PR23_RECONCILIATION_MODULES_GENERATED statements=${orderedStatements.length} preserved=${rejected.length}`);
