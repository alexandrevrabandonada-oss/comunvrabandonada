import { createHash } from "node:crypto";

const scopedTables = [
  "comun_sidewalk_records",
  "comun_sidewalk_uploads",
  "comun_sidewalk_duplicate_suggestions",
  "comun_schema_releases",
];
const legacyGrantTables = [
  "comun_actions",
  "comun_admin_audit_log",
  "comun_admin_users",
  "comun_communities",
  "comun_dossiers",
  "comun_issues",
  "comun_pauta_evidence_items",
  "comun_pauta_spaces",
  "comun_pauta_tasks",
  "comun_public_lookup_events",
  "comun_report_attachments",
  "comun_reports",
];
export const fingerprintScope = "sidewalk-operational-v1";
export const structuralFingerprintScope = "sidewalk-operational-v2";
export const scopedObjects = [...scopedTables, ...legacyGrantTables].sort();
export const normalize = (value) => JSON.parse(JSON.stringify(value));
export const fingerprint = (document) =>
  createHash("sha256")
    .update(JSON.stringify(normalize(document)))
    .digest("hex");
export const query = String.raw`
with scoped as (select unnest(array['comun_sidewalk_records','comun_sidewalk_uploads','comun_sidewalk_duplicate_suggestions','comun_schema_releases']) as name), grants as (select unnest(array['comun_actions','comun_admin_audit_log','comun_admin_users','comun_communities','comun_dossiers','comun_issues','comun_pauta_evidence_items','comun_pauta_spaces','comun_pauta_tasks','comun_public_lookup_events','comun_report_attachments','comun_reports']) as name)
select jsonb_build_object(
 'relations',(select coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity) order by c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace join scoped s on s.name=c.relname where n.nspname='public'),
 'columns',(select coalesce(jsonb_agg(jsonb_build_object('table',table_name,'name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by table_name,ordinal_position),'[]'::jsonb) from information_schema.columns where table_schema='public' and table_name in(select name from scoped)),
 'constraints',(select coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',x.conname,'definition',pg_get_constraintdef(x.oid,true)) order by c.relname,x.conname),'[]'::jsonb) from pg_constraint x join pg_class c on c.oid=x.conrelid join pg_namespace n on n.oid=c.relnamespace join scoped s on s.name=c.relname where n.nspname='public'),
 'indexes',(select coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) order by tablename,indexname),'[]'::jsonb) from pg_indexes where schemaname='public' and tablename in(select name from scoped)),
 'policies',(select coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'permissive',permissive,'roles',roles,'command',cmd,'using',qual,'check',with_check) order by tablename,policyname),'[]'::jsonb) from pg_policies where schemaname='public' and tablename in(select name from scoped)),
 'grants',(select coalesce(jsonb_agg(jsonb_build_object('table',table_name,'grantee',grantee,'privilege',privilege_type) order by table_name,grantee,privilege_type),'[]'::jsonb) from information_schema.role_table_grants where table_schema='public' and table_name in(select name from scoped union select name from grants)),
 'ledger',(select coalesce(jsonb_agg(jsonb_build_object('release',release,'migrationPath',migration_path,'migrationSha256',migration_sha256,'pre',pre_fingerprint,'post',post_fingerprint,'status',status) order by release),'[]'::jsonb) from public.comun_schema_releases where release='20260724233256-comun-sidewalk-operational-hardening')
)::text;`;
export function buildDocument(raw) {
  const canonical = normalize(raw);
  for (const key of Object.keys(canonical))
    canonical[key] = Array.isArray(canonical[key])
      ? canonical[key].sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        )
      : canonical[key];
  return {
    formatVersion: 1,
    scope: fingerprintScope,
    objects: scopedObjects,
    canonical,
  };
}

export function buildStructuralDocument(raw) {
  const { ledger: _targetLedger, ...canonical } = buildDocument(raw).canonical;
  return {
    formatVersion: 2,
    scope: structuralFingerprintScope,
    objects: scopedObjects,
    canonical,
  };
}
