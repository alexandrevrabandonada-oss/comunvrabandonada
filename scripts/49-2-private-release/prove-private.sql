\set ON_ERROR_STOP on
do $$
declare
  bridge text;
  signature text;
  object_count integer;
begin
  select count(*) into object_count from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'private' and c.relkind = 'r'
     and c.relname in (
       'comun_relata_collective_entities',
       'comun_relata_collective_entity_representations',
       'comun_relata_collective_entity_consents',
       'comun_relata_collective_entity_events'
     );
  if object_count <> 4 then raise exception 'COMUN_49_2_PRIVATE_TABLE_SET_INVALID'; end if;

  for bridge, signature in select * from (values
    ('create', 'public.comun_relata_collective_entity_server_create(uuid,uuid,text,text)'),
    ('consent', 'public.comun_relata_collective_entity_server_consent_set(uuid,uuid,boolean)'),
    ('revoke', 'public.comun_relata_collective_entity_server_representation_revoke(uuid,uuid)'),
    ('list', 'public.comun_relata_collective_entity_server_list_own(uuid)')
  ) expected(name, signature) loop
    if not exists (
      select 1 from pg_catalog.pg_proc p
       where p.oid = signature::pg_catalog.regprocedure
         and p.prosecdef
         and p.proowner = 'postgres'::pg_catalog.regrole
         and p.proconfig = array['search_path=pg_catalog']::text[]
    ) or pg_catalog.has_function_privilege('anon', signature, 'EXECUTE')
      or pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE')
      or not pg_catalog.has_function_privilege('service_role', signature, 'EXECUTE')
      or exists (
        select 1 from pg_catalog.pg_proc p,
          pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
         where p.oid = signature::pg_catalog.regprocedure
           and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      ) then raise exception 'COMUN_49_2_R2_BRIDGE_SECURITY_INVALID: %', bridge; end if;
  end loop;

  if exists (
    select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname ~ '^comun_relata_collective_entit'
  ) or exists (
    select 1 from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname ~ '^comun_relata_collective_entit'
       and p.proname not in (
         'comun_relata_collective_entity_server_create',
         'comun_relata_collective_entity_server_consent_set',
         'comun_relata_collective_entity_server_representation_revoke',
         'comun_relata_collective_entity_server_list_own'
       )
  ) then raise exception 'COMUN_49_2_PRIVATE_RUNTIME_PUBLIC_PROJECTION_FOUND'; end if;
  if pg_catalog.has_schema_privilege('anon', 'private', 'USAGE')
    or pg_catalog.has_schema_privilege('authenticated', 'private', 'USAGE')
    or pg_catalog.has_schema_privilege('service_role', 'private', 'USAGE')
  then raise exception 'COMUN_49_2_PRIVATE_SCHEMA_EXPOSED'; end if;
end;
$$;
select 'COMUN_49_2_PRIVATE_RUNTIME_NO_PUBLIC_PROJECTION' as result;
