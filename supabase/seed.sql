-- COMUN VR ABANDONADA — seed local intencionalmente vazio.
--
-- Contrato:
-- - Todo o schema e dados de referência vivem exclusivamente em supabase/migrations/.
-- - Nenhuma persona de teste, fixture ou usuário real é criada por seed.
-- - Personas e fixtures de teste são criadas pelas factories de teste
--   (tests/fixtures/comun/) e removidas pelos respectivos cleanups.
-- - Este arquivo existe para manter `[db.seed] sql_paths` válido e
--   determinístico em `supabase db reset --local`, sem efeitos colaterais.
--
-- Manter este arquivo sem instruções SQL com efeito. Se um dia for necessário
-- semear dados de referência, fazê-lo via migration, não aqui.

select 1 where false;
