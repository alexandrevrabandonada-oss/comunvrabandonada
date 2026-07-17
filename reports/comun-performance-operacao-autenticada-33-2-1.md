# Performance autenticada — Sprint 33.2.1

Foi implementado coletor opt-in `COMUN_LOCAL_PERF=true`, com recusa de host remoto, sanitização recursiva, payload, request, RSS, heap, itens renderizados, dados serializados, contagem declarada de queries e detecção de originais.

| Superfície | Itens | HTTP | Média | P95 local | Payload | Queries | SQL acumulado | RSS delta |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 13 cenários previstos | 0–100 | não medido | — | — | — | — | — | — |

O gate `next start` parou no Axe antes da fase de performance; portanto nenhuma medição foi inventada. O módulo local-only tem 4/4 unitários. A listagem central mantém uma consulta paginada/limitada a 100 e as superfícies de estado não consultam o banco; originais não são carregados nessas listagens. Limite de 25/dia segue recomendação humana, não bloqueio técnico.

