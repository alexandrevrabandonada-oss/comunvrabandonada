\set ON_ERROR_STOP on

-- Assertions somente leitura para o estado final esperado pela PR #23.

do $$
declare
  required_tables text[] := array[
    'comun_pauta_modules','comun_member_profiles','comun_pauta_memberships',
    'comun_archive_artworks','comun_archive_storage_uploads','comun_radio_programs',
    'comun_member_inbox','comun_sidewalk_records','comun_sidewalk_priorities',
    'comun_editorial_operation_items','comun_community_memberships',
    'comun_sidewalk_observations','comun_sidewalk_forwardings','comun_sidewalk_uploads'
  ];
  required_table text;
begin
  foreach required_table in array required_tables loop
    if to_regclass(format('public.%I',required_table)) is null then
      raise exception 'PR23_POSTFLIGHT: tabela ausente %', required_table;
    end if;
  end loop;

  if exists (
    select 1
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname = any(required_tables)
      and c.relkind in ('r','p') and not c.relrowsecurity
  ) then
    raise exception 'PR23_POSTFLIGHT: tabela exposta sem RLS';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='comun_sidewalk_records'
      and policyname='member_reads_own_sidewalk_records'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'PR23_POSTFLIGHT: policy do dono do registro ausente';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='comun_sidewalk_uploads'
      and policyname='member_reads_own_sidewalk_uploads'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'PR23_POSTFLIGHT: policy do ticket de upload ausente';
  end if;

  if exists (
    select 1 from information_schema.table_privileges
    where table_schema='public'
      and table_name in ('comun_sidewalk_uploads','comun_sidewalk_forwardings',
                         'comun_editorial_operation_items','comun_community_role_assignments')
      and grantee='anon'
  ) then
    raise exception 'PR23_POSTFLIGHT: grant anon inesperado em tabela privada';
  end if;

  if not exists (
    select 1 from pg_constraint where conrelid='public.comun_member_profiles'::regclass
      and conname='comun_member_profiles_user_id_fkey'
      and pg_get_constraintdef(oid,true)='FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) or not exists (
    select 1 from pg_constraint where conrelid='public.comun_member_profiles'::regclass
      and conname='comun_member_profiles_territory_id_fkey'
      and pg_get_constraintdef(oid,true)='FOREIGN KEY (territory_id) REFERENCES comun_hub_territories(id) ON DELETE SET NULL'
  ) or not exists (
    select 1 from pg_constraint where conrelid='public.comun_member_inbox'::regclass
      and conname='comun_member_inbox_member_user_id_fkey'
      and pg_get_constraintdef(oid,true)='FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) or not exists (
    select 1 from pg_constraint where conrelid='public.comun_member_inbox'::regclass
      and conname='comun_member_inbox_pauta_id_fkey'
      and pg_get_constraintdef(oid,true)='FOREIGN KEY (pauta_id) REFERENCES comun_pauta_spaces(id) ON DELETE CASCADE'
  ) then
    raise exception 'PR23_POSTFLIGHT: superset de FKs de member profiles/inbox incompleto';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    if has_function_privilege('public',to_regprocedure('public.handle_new_user()'),'EXECUTE')
      or has_function_privilege('anon',to_regprocedure('public.handle_new_user()'),'EXECUTE')
      or has_function_privilege('authenticated',to_regprocedure('public.handle_new_user()'),'EXECUTE') then
      raise exception 'PR23_POSTFLIGHT: handle_new_user ainda exposta';
    end if;
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and (p.proconfig is null or not ('search_path=public'=any(p.proconfig)))
  ) then
    raise exception 'PR23_POSTFLIGHT: SECURITY DEFINER sem search_path explícito';
  end if;

  if has_function_privilege('public',
       'public.claim_next_archive_processing_job(text)'::regprocedure,'EXECUTE')
     or has_function_privilege('anon',
       'public.claim_next_archive_processing_job(text)'::regprocedure,'EXECUTE')
     or has_function_privilege('authenticated',
       'public.claim_next_archive_processing_job(text)'::regprocedure,'EXECUTE') then
    raise exception 'PR23_POSTFLIGHT: função de claim exposta';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name in
      ('comun_public_sidewalk_records','comun_public_sidewalk_observations')
      and column_name in ('private_geometry_geojson','location_accuracy_m','object_key',
                          'submission_payload','private_notes')
  ) then
    raise exception 'PR23_POSTFLIGHT: projeção pública contém coluna privada';
  end if;

  raise notice 'PR23_POSTFLIGHT_ASSERTIONS_OK';
end $$;
