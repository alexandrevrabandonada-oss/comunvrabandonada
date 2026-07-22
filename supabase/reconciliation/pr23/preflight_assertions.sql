\set ON_ERROR_STOP on

-- PR #23: assertions somente leitura para o snapshot auditado em 2026-07-21.
-- Este arquivo não altera schema, dados ou histórico de migrations.

do $$
declare
  missing_versions text[] := array[
    '20260715025948','20260715032613','20260715151922','20260715155802',
    '20260715170058','20260715174723','20260715185344','20260715192935',
    '20260716000000','20260716120000','20260717013709','20260717022301',
    '20260718031145','20260719180751','20260719202300','20260720161117',
    '20260720185530','20260721155914','20260721164415'
  ];
  recorded_missing integer;
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'PR23_PREFLIGHT: histórico de migrations indisponível';
  end if;

  select count(*) into recorded_missing
  from supabase_migrations.schema_migrations
  where version = any(missing_versions);
  if recorded_missing <> 0 then
    raise exception 'PR23_PREFLIGHT: uma migration esperada como ausente já foi registrada (%)', recorded_missing;
  end if;

  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260720005353'
  ) then
    raise exception 'PR23_PREFLIGHT: migration fora de ordem 20260720005353 não está registrada';
  end if;

  if to_regclass('public.comun_member_profiles') is null
     or to_regclass('public.comun_member_inbox') is null then
    raise exception 'PR23_PREFLIGHT: tabelas antecipadas não correspondem ao snapshot';
  end if;

  if to_regclass('public.comun_pauta_modules') is not null
     or to_regclass('public.comun_archive_artworks') is not null
     or to_regclass('public.comun_radio_programs') is not null
     or to_regclass('public.comun_sidewalk_records') is not null
     or to_regclass('public.comun_editorial_operation_items') is not null
     or to_regclass('public.comun_sidewalk_uploads') is not null then
    raise exception 'PR23_PREFLIGHT: objeto da cadeia ausente apareceu desde o snapshot';
  end if;

  if (select count(*) from information_schema.columns
      where table_schema='public' and table_name='comun_member_profiles') <> 16 then
    raise exception 'PR23_PREFLIGHT: comun_member_profiles mudou de colunas';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.comun_member_profiles'::regclass
      and conname='comun_member_profiles_user_id_fkey'
      and pg_get_constraintdef(oid,true) =
        'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) then
    raise exception 'PR23_PREFLIGHT: FK remota user_id de comun_member_profiles divergiu';
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid='public.comun_member_profiles'::regclass
      and conname='comun_member_profiles_territory_id_fkey'
  ) then
    raise exception 'PR23_PREFLIGHT: FK territory_id já existe; snapshot ficou obsoleto';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.comun_member_inbox'::regclass
      and conname='comun_member_inbox_member_user_id_fkey'
  ) or exists (
    select 1 from pg_constraint
    where conrelid='public.comun_member_inbox'::regclass
      and conname='comun_member_inbox_pauta_id_fkey'
  ) then
    raise exception 'PR23_PREFLIGHT: FKs de comun_member_inbox divergiram';
  end if;

  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prosecdef) <> 2 then
    raise exception 'PR23_PREFLIGHT: conjunto SECURITY DEFINER divergiu';
  end if;

  raise notice 'PR23_PREFLIGHT_ASSERTIONS_OK';
end $$;

