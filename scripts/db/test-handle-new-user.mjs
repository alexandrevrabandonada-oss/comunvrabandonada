import { spawnSync } from "node:child_process";

const names = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
const container = names.stdout.split(/\r?\n/).find((name) => name.startsWith("supabase_db_"));
if (!container) throw new Error("COMUN_HANDLE_NEW_USER_LOCAL_DB_REQUIRED");

const sql = String.raw`
begin;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  website_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $setup$
begin
  if to_regprocedure('public.handle_new_user()') is null then
    execute $fn$
      create function public.handle_new_user()
      returns trigger language plpgsql security definer
      set search_path = pg_catalog
      as $body$
      begin
        insert into public.profiles (id, username, display_name)
        values (
          new.id,
          coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
        )
        on conflict (id) do nothing;
        return new;
      end
      $body$
    $fn$;
    revoke all on function public.handle_new_user() from public, anon, authenticated;
    grant execute on function public.handle_new_user() to service_role;
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='auth.users'::regclass
      and tgname='on_auth_user_created'
      and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end
$setup$;

do $test$
declare
  first_id uuid := '10000000-0000-4000-8000-000000000001';
  collision_id uuid := '10000000-0000-4000-8000-000000000002';
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at
  ) values (
    first_id, 'authenticated', 'authenticated', 'fixture-one@example.invalid',
    '', '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"comun_fixture_collision","display_name":"Pessoa Fixture","admin":true}'::jsonb,
    now(), now()
  );
  if not exists (
    select 1 from public.profiles
    where id=first_id and username='comun_fixture_collision'
      and display_name='Pessoa Fixture' and is_verified=false
  ) then
    raise exception 'COMUN_HANDLE_NEW_USER_PROFILE_CONTRACT_FAILED';
  end if;

  begin
    insert into auth.users (
      id, aud, role, email, encrypted_password, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at
    ) values (
      collision_id, 'authenticated', 'authenticated', 'fixture-two@example.invalid',
      '', '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"comun_fixture_collision","display_name":"Collision"}'::jsonb,
      now(), now()
    );
    raise exception 'COMUN_HANDLE_NEW_USER_COLLISION_NOT_REJECTED';
  exception when unique_violation then
    null;
  end;
  if exists (select 1 from auth.users where id=collision_id)
     or exists (select 1 from public.profiles where id=collision_id)
  then
    raise exception 'COMUN_HANDLE_NEW_USER_COLLISION_PARTIAL_STATE';
  end if;

  delete from auth.users where id=first_id;
  if exists (select 1 from public.profiles where id=first_id) then
    raise exception 'COMUN_HANDLE_NEW_USER_FIXTURE_RESIDUAL';
  end if;
end
$test$;
rollback;
`;

const result = spawnSync(
  "docker",
  ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1"],
  { input: sql, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
if (result.status !== 0) {
  throw new Error(`COMUN_HANDLE_NEW_USER_TEST_FAILED:${result.stderr.trim()}`);
}
console.log("COMUN_HANDLE_NEW_USER_TRIGGER_OK");
console.log("COMUN_HANDLE_NEW_USER_FIXTURE_CLEAN");
