# Performance autenticada com carga real

Medição local em `next start`, três amostras por cenário. Fonte: `comun-performance-carga-real-33-2-1.json`.

| Itens | Média | P95 local | Payload | Renderizados | Originais | Queries |
|---:|---:|---:|---:|---:|---:|---:|
| 0 | 963,20 ms | 1066,36 ms | 15.284 B | 0 | 0 | 1 |
| 25 | 2203,00 ms | 2426,55 ms | 27.860 B | 25 | 0 | 1 |
| 50 | 3232,30 ms | 4082,86 ms | 41.494 B | 50 | 0 | 1 |
| 100 | 3393,90 ms | 3539,64 ms | 68.613 B | 100 | 0 | 1 |

Sem original privado, query por card ou N+1 observado: a central tem uma consulta de lista. Porém ela usa `limit(100)` e renderiza todos os itens; payload cresce com o total e não há paginação/filtros server-side na superfície atual. Isto é uma limitação de produto fora deste escopo, portanto `COMUN_AUTHENTICATED_PERFORMANCE_LOCAL_OK` prova materialização do harness, não aprova escalabilidade/paginação.
