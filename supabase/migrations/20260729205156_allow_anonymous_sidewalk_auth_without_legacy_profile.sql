begin;

do $preflight$
begin
  if pg_catalog.to_regprocedure('public.handle_new_user()') is null then
    if exists (
      select 1
      from pg_catalog.pg_trigger
      where tgrelid = 'auth.users'::pg_catalog.regclass
        and tgname = 'on_auth_user_created'
        and not tgisinternal
    ) then
      raise exception 'COMUN_ANONYMOUS_AUTH_PROFILE_TRIGGER_FUNCTION_MISSING';
    end if;
    return;
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = 'auth.users'::pg_catalog.regclass
      and attname = 'is_anonymous'
      and atttypid = 'pg_catalog.bool'::pg_catalog.regtype
      and not attisdropped
  ) then
    raise exception 'COMUN_ANONYMOUS_AUTH_IS_ANONYMOUS_COLUMN_MISSING';
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'auth.users'::pg_catalog.regclass
      and tgname = 'on_auth_user_created'
      and tgfoid = 'public.handle_new_user()'::pg_catalog.regprocedure
      and not tgisinternal
  ) then
    raise exception 'COMUN_ANONYMOUS_AUTH_PROFILE_TRIGGER_MISSING';
  end if;
end
$preflight$;

do $migration$
begin
  -- Instalações limpas não possuem o trigger legado e não precisam do reparo.
  if pg_catalog.to_regprocedure('public.handle_new_user()') is null then
    return;
  end if;

  execute $sql$
    create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog
    as $function$
    begin
      -- Sessões anônimas das Calçadas não são perfis públicos. Elas recebem
      -- somente o usuário Auth necessário ao ownership/RLS do envio privado.
      if new.is_anonymous is true then
        return new;
      end if;

      insert into public.profiles (id, username, display_name)
      values (
        new.id,
        coalesce(
          new.raw_user_meta_data->>'username',
          pg_catalog.split_part(new.email, '@', 1)
        ),
        coalesce(
          new.raw_user_meta_data->>'display_name',
          pg_catalog.split_part(new.email, '@', 1)
        )
      )
      on conflict (id) do nothing;

      return new;
    end;
    $function$
  $sql$;

  execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  execute 'grant execute on function public.handle_new_user() to service_role';
end
$migration$;

do $postflight$
begin
  if pg_catalog.to_regprocedure('public.handle_new_user()') is not null
     and not exists (
    select 1
    from pg_catalog.pg_proc
    where oid = 'public.handle_new_user()'::pg_catalog.regprocedure
      and prosecdef
      and proconfig = array['search_path=pg_catalog']
      and prosrc like '%if new.is_anonymous is true then%'
      and prosrc like '%insert into public.profiles%'
  ) then
    raise exception 'COMUN_ANONYMOUS_AUTH_PROFILE_TRIGGER_POSTFLIGHT_FAILED';
  end if;
end
$postflight$;

commit;
