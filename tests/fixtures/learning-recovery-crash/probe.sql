-- SYNTHETIC LOCAL LAB ONLY. This intentionally exercises a known crash path.
begin;
set local role anon;
select public.recovery_crash_minimal();
rollback;
