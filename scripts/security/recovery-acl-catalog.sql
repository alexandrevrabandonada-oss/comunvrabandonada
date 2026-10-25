-- Read-only metadata only. No role passwords, application rows or Auth data.
with scopes as (
  select oid, nspname from pg_namespace
  where nspname in ('public','private','comun_auth_private','supabase_migrations')
), objects as (
  select 'schema'::text kind, format('%I', n.nspname) identity,
    n.nspowner owner_id, coalesce(n.nspacl,acldefault('n',n.nspowner)) acl
  from pg_namespace n join scopes s on s.oid=n.oid
  union all
  select case when c.relkind='S' then 'sequence' else 'table' end,
    format('%I.%I',s.nspname,c.relname),c.relowner,
    coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))
  from pg_class c join scopes s on s.oid=c.relnamespace
  where c.relkind in ('r','p','v','m','f','S')
  union all
  select case when p.prokind='p' then 'procedure' else 'function' end,
    format('%I.%I(%s)',s.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),
    p.proowner,coalesce(p.proacl,acldefault('f',p.proowner))
  from pg_proc p join scopes s on s.oid=p.pronamespace
  union all
  select 'type',format('%I.%I',s.nspname,t.typname),t.typowner,
    coalesce(t.typacl,acldefault('T',t.typowner))
  from pg_type t join scopes s on s.oid=t.typnamespace
  left join pg_class c on c.oid=t.typrelid
  where t.typisdefined and t.typelem=0 and (t.typrelid=0 or c.relkind='c')
  union all
  select 'column',format('%I.%I.%I',s.nspname,c.relname,a.attname),c.relowner,
    coalesce(a.attacl,'{}'::aclitem[])
  from pg_attribute a join pg_class c on c.oid=a.attrelid
  join scopes s on s.oid=c.relnamespace
  where c.relkind in ('r','p','v','m','f') and a.attnum>0 and not a.attisdropped
), entries as (
  select o.kind,o.identity,pg_get_userbyid(o.owner_id) owner,
    coalesce((select jsonb_agg(jsonb_build_object(
      'grantor',pg_get_userbyid(a.grantor),
      'grantee',case when a.grantee=0 then null else pg_get_userbyid(a.grantee) end,
      'privilege',a.privilege_type,'grantable',a.is_grantable))
      from aclexplode(case when cardinality(o.acl)>0 then o.acl else null::aclitem[] end) a),'[]'::jsonb) grants
  from objects o
), defaults as (
  select pg_get_userbyid(d.defaclrole) owner,
    case when d.defaclnamespace=0 then '*' else n.nspname end scope,
    d.defaclobjtype::text kind,
    coalesce((select jsonb_agg(jsonb_build_object(
      'grantor',pg_get_userbyid(a.grantor),
      'grantee',case when a.grantee=0 then null else pg_get_userbyid(a.grantee) end,
      'privilege',a.privilege_type,'grantable',a.is_grantable))
      from aclexplode(case when cardinality(d.defaclacl)>0 then d.defaclacl else null::aclitem[] end) a),'[]'::jsonb) grants
  from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
  where d.defaclnamespace=0 or n.nspname in (select nspname from scopes)
)
select jsonb_build_object(
  'formatVersion',1,
  'schemas',coalesce((select jsonb_agg(nspname) from scopes),'[]'::jsonb),
  'objects',coalesce((select jsonb_agg(to_jsonb(e)) from entries e),'[]'::jsonb),
  'defaults',coalesce((select jsonb_agg(to_jsonb(d)) from defaults d),'[]'::jsonb)
);
