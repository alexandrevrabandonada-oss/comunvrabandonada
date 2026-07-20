# Performance de filas — Sprint 33.2.2

O harness foi atualizado para 25/50/100 itens reais e página de 20, validando SQL, HTML e DOM contra `next start`. A execução ainda é pendente porque E2E/Auth local não estabilizou após o reset; nenhuma métrica foi inventada.

Contrato de consultas: 1 RPC agregada de itens/contagens e até 3 consultas limitadas de opções de filtro (responsáveis, pautas e territórios), sempre constantes e nunca por card. Não há carregamento de originais.

Resultado: `COMUN_OPERATIONAL_PAGINATION_PERFORMANCE_LOCAL_OK` **ainda não emitido**.
