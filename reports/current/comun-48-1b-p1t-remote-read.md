# COMUN 48.1B-P1T — leitura remota do território

Data: 2026-08-06

## Resultado

`COMUN_P1T_REMOTE_TERRITORY_SCHEMA_READ_COMPLETE`

Classificação: `COMUN_P1T_REMOTE_TERRITORY_ABSENT`.

## Evidência sanitizada

- `public.comun_member_profiles` existe.
- As colunas `territory_municipality`, `territory_neighborhood` e `territory_source_version` estão ausentes.
- RLS está habilitada; `force_rls=false` no estado anterior.
- Grants de tabela observados somente para `service_role`; nenhum grant de tabela para `PUBLIC`, `anon` ou `authenticated`.
- Nenhuma policy foi retornada para a tabela.
- A migration local-only `20260805090000_comun_member_profile_territory_selection.sql` não está no ledger remoto `public.comun_schema_releases`.
- Nenhum valor individual de perfil foi lido.

## Decisão

Prosseguir com uma migration nova, aditiva e forward-only. A migration local-only histórica não será movida nem promovida.
