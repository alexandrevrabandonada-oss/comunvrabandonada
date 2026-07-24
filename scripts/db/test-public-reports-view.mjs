import { spawnSync } from "node:child_process";

const names = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
const container = names.stdout.split(/\r?\n/).find((name) => name.startsWith("supabase_db_"));
if (!container) throw new Error("COMUN_PUBLIC_REPORTS_LOCAL_DB_REQUIRED");

const sql = String.raw`
begin;
insert into public.comun_communities (
  slug, name, short_description, full_description, main_cta
) values (
  'comun-view-fixture', 'Fixture', 'Fixture descartável',
  'Fixture descartável', 'Fixture'
) on conflict (slug) do nothing;
insert into public.comun_reports (
  protocol, community_slug, title, raw_text, public_text, status,
  can_publish_sanitized, private_contact, internal_notes, latitude, longitude
) values
  ('COMUN-VIEW-PUBLIC', 'comun-view-fixture', 'Publicado', 'privado-a',
   'texto sanitizado', 'published', true, 'private@example.invalid', 'nota', -22.5, -44.1),
  ('COMUN-VIEW-PRIVATE', 'comun-view-fixture', 'Pendente', 'privado-b',
   null, 'received', false, 'private@example.invalid', 'nota', -22.6, -44.2);

set role anon;
do $anon$
declare visible_count integer;
begin
  select count(*) into visible_count
  from public.comun_public_reports
  where protocol like 'COMUN-VIEW-%';
  if visible_count <> 1 then raise exception 'COMUN_PUBLIC_REPORTS_VISIBILITY_FAILED'; end if;
  if not has_table_privilege(current_user,'public.comun_public_reports','SELECT')
     or has_table_privilege(current_user,'public.comun_public_reports','INSERT')
     or has_table_privilege(current_user,'public.comun_public_reports','UPDATE')
     or has_table_privilege(current_user,'public.comun_public_reports','DELETE')
     or has_table_privilege(current_user,'public.comun_public_reports','TRUNCATE')
     or has_table_privilege(current_user,'public.comun_public_reports','TRIGGER')
     or has_table_privilege(current_user,'public.comun_public_reports','REFERENCES')
  then raise exception 'COMUN_PUBLIC_REPORTS_GRANT_CONTRACT_FAILED'; end if;
  if has_column_privilege(current_user,'public.comun_reports','raw_text','SELECT')
     or has_column_privilege(current_user,'public.comun_reports','private_contact','SELECT')
     or has_column_privilege(current_user,'public.comun_reports','internal_notes','SELECT')
     or has_column_privilege(current_user,'public.comun_reports','latitude','SELECT')
     or has_column_privilege(current_user,'public.comun_reports','longitude','SELECT')
  then raise exception 'COMUN_PUBLIC_REPORTS_PRIVATE_COLUMN_EXPOSURE'; end if;
end
$anon$;
reset role;

set role authenticated;
do $authenticated$
declare visible_count integer;
begin
  select count(*) into visible_count
  from public.comun_public_reports
  where protocol like 'COMUN-VIEW-%';
  if visible_count <> 1 then raise exception 'COMUN_PUBLIC_REPORTS_AUTH_VISIBILITY_FAILED'; end if;
end
$authenticated$;
reset role;
rollback;
`;

const result = spawnSync(
  "docker",
  ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1"],
  { input: sql, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
if (result.status !== 0) {
  throw new Error(`COMUN_PUBLIC_REPORTS_TEST_FAILED:${result.stderr.trim()}`);
}
console.log("COMUN_PUBLIC_REPORTS_LEAST_PRIVILEGE_OK");
