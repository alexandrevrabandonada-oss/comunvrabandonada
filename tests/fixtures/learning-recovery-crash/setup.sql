-- SYNTHETIC LOCAL LAB ONLY. No School migration, tables or business data needed.
create function public.recovery_crash_minimal() returns integer
language plpgsql as $$ begin return 1; end; $$;
revoke all on function public.recovery_crash_minimal() from public,anon;
select has_function_privilege('anon','public.recovery_crash_minimal()','execute');
-- Expected: false. This setup does not grant privileges to anon.
