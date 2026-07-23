# Reset duplo — Sprint 37

Status: **RECONSTRUÇÕES DO BANCO APROVADAS; GATES INTEGRAIS PENDENTES**.

- rodada 1: `supabase db reset --local` aprovado em 71,8 s; `db lint` e `RLS_MATRIX_OK`;
- rodada 2: novo reset aprovado em 72,5 s; `db lint`, `RLS_MATRIX_OK` e unitários aprovados;
- após a rodada 2: E2E público 30/30 em cinco viewports e build aprovados.

As rodadas não executaram o cenário autenticado completo com novos usuários, moderação, prioridade e pacote. Portanto, os marcadores `COMUN_SIDEWALK_REAL_MAP_RESET_1_OK` e `COMUN_SIDEWALK_REAL_MAP_RESET_2_OK` continuam corretamente não emitidos.
