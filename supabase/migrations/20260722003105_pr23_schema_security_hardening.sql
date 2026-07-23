-- PR #23 — alvo canônico endurecido, aditivo e válido em instalações limpas.
-- As migrations históricas permanecem imutáveis.

-- Tickets de upload são escritos exclusivamente pelo backend. O usuário
-- autenticado pode consultar somente o próprio ticket por RLS.
revoke all privileges on table public.comun_sidewalk_uploads from public, anon, authenticated;
grant select on table public.comun_sidewalk_uploads to authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.comun_sidewalk_uploads to service_role;

do $$
declare
  target_sequence text;
begin
  for target_sequence in
    select format('%I.%I', s.sequence_schema, s.sequence_name)
    from information_schema.sequences s
    where s.sequence_schema = 'public'
      and s.sequence_name like 'comun_sidewalk_uploads%'
  loop
    execute format('revoke all privileges on sequence %s from public, anon, authenticated', target_sequence);
    execute format('grant usage, select, update on sequence %s to service_role', target_sequence);
  end loop;
end $$;

alter table public.comun_sidewalk_uploads enable row level security;

-- O snapshot remoto antecipou estas tabelas. O alvo é o superset explícito
-- das FKs seguras do remoto e do schema final local.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.comun_member_profiles'::regclass
      and conname = 'comun_member_profiles_user_id_fkey'
      and pg_get_constraintdef(oid, true) <>
        'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) then
    raise exception 'PR23_HARDENING: FK user_id de comun_member_profiles existe com definição divergente';
  elsif not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comun_member_profiles'::regclass
      and conname = 'comun_member_profiles_user_id_fkey'
  ) then
    if exists (
      select 1 from public.comun_member_profiles p
      left join auth.users u on u.id = p.user_id
      where u.id is null
    ) then
      raise exception 'PR23_HARDENING: linhas órfãs impedem FK user_id de comun_member_profiles';
    end if;
    alter table public.comun_member_profiles
      add constraint comun_member_profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comun_member_profiles'::regclass
      and conname = 'comun_member_profiles_territory_id_fkey'
      and pg_get_constraintdef(oid, true) =
        'FOREIGN KEY (territory_id) REFERENCES comun_hub_territories(id) ON DELETE SET NULL'
  ) then
    raise exception 'PR23_HARDENING: FK canônica territory_id de comun_member_profiles ausente ou divergente';
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.comun_member_inbox'::regclass
      and conname = 'comun_member_inbox_member_user_id_fkey'
      and pg_get_constraintdef(oid, true) <>
        'FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE CASCADE'
  ) then
    raise exception 'PR23_HARDENING: FK member_user_id de comun_member_inbox existe com definição divergente';
  elsif not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comun_member_inbox'::regclass
      and conname = 'comun_member_inbox_member_user_id_fkey'
  ) then
    if exists (
      select 1 from public.comun_member_inbox i
      left join auth.users u on u.id = i.member_user_id
      where u.id is null
    ) then
      raise exception 'PR23_HARDENING: linhas órfãs impedem FK member_user_id de comun_member_inbox';
    end if;
    alter table public.comun_member_inbox
      add constraint comun_member_inbox_member_user_id_fkey
      foreign key (member_user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.comun_member_inbox'::regclass
      and conname = 'comun_member_inbox_pauta_id_fkey'
      and pg_get_constraintdef(oid, true) =
        'FOREIGN KEY (pauta_id) REFERENCES comun_pauta_spaces(id) ON DELETE CASCADE'
  ) then
    raise exception 'PR23_HARDENING: FK canônica pauta_id de comun_member_inbox ausente ou divergente';
  end if;
end $$;

alter table public.comun_member_profiles enable row level security;
alter table public.comun_member_inbox enable row level security;
revoke all privileges on table public.comun_member_profiles, public.comun_member_inbox
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.comun_member_profiles, public.comun_member_inbox to service_role;

-- Drift remoto temporariamente preservado: se handle_new_user existir, ele
-- deixa de ser uma API pública. A migration limpa não cria a função/trigger.
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    revoke all privileges on function public.handle_new_user() from public, anon, authenticated;
    grant execute on function public.handle_new_user() to service_role;
  end if;
end $$;

-- Assertions executadas na própria migration.
do $$
declare
  forbidden_privilege text;
begin
  foreach forbidden_privilege in array array[
    'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
  ] loop
    if has_table_privilege('anon', 'public.comun_sidewalk_uploads', forbidden_privilege) then
      raise exception 'PR23_HARDENING: anon ainda possui % em comun_sidewalk_uploads', forbidden_privilege;
    end if;
  end loop;

  if exists (
    select 1 from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'comun_sidewalk_uploads'
      and grantee = 'PUBLIC'
  ) then
    raise exception 'PR23_HARDENING: PUBLIC ainda possui grant em comun_sidewalk_uploads';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.comun_sidewalk_uploads'::regclass) then
    raise exception 'PR23_HARDENING: RLS desativada em comun_sidewalk_uploads';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comun_sidewalk_uploads'
      and policyname = 'member_reads_own_sidewalk_uploads'
      and roles = array['authenticated']::name[]
      and cmd = 'SELECT'
  ) then
    raise exception 'PR23_HARDENING: policy de leitura do próprio ticket ausente';
  end if;
end $$;
