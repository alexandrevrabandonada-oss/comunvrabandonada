\set ON_ERROR_STOP on
begin;
insert into public.comun_schema_releases (
  release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, status
) values (
  '20260924-comun-49-2-private-collective-runtime-r1-r2',
  'bundle:supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json',
  'b07c45a827b32b6627bb880fab5b6c536a1784c06eb8c4a1a9e6cdb9a010041d',
  'a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98',
  '7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60',
  'applied'
);
do $$
begin
  if (select count(*) from public.comun_schema_releases
       where release = '20260924-comun-49-2-private-collective-runtime-r1-r2'
         and migration_path = 'bundle:supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json'
         and migration_sha256 = 'b07c45a827b32b6627bb880fab5b6c536a1784c06eb8c4a1a9e6cdb9a010041d'
         and pre_fingerprint = 'a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98'
         and post_fingerprint = '7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60'
         and status = 'applied') <> 1 then
    raise exception 'COMUN_49_2_PRIVATE_RELEASE_LEDGER_INVALID';
  end if;
end;
$$;
commit;
select 'COMUN_49_2_PRIVATE_RELEASE_LOGICAL_LEDGER_PROVED' as result;
