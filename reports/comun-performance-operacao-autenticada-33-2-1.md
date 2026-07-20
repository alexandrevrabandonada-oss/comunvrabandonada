# Performance autenticada — Sprint 33.2.1

Medição local contra `next start`, gerada em `2026-07-18T01:56:27Z`. Fonte numérica: `comun-performance-operacao-autenticada-33-2-1.json`.

| Superfície | Itens rotulados | HTTP | Média/medição | Payload | Queries | RSS delta | Heap |
|---|---:|---:|---:|---:|---:|---:|---:|
| central vazia | 0 | 200 | 830,64 ms | 8.756 B | 1 | -14.327.808 B | 10.000.000 B |
| central 25 | 25 | 200 | 546,58 ms | 8.756 B | 1 | -13.787.136 B | 10.000.000 B |
| central 50 | 50 | 200 | 550,85 ms | 8.756 B | 1 | -12.726.272 B | 10.000.000 B |
| central 100 | 100 | 200 | 550,91 ms | 8.756 B | 1 | -12.029.952 B | 10.000.000 B |
| fila filtrada | 25 | 200 | 544,12 ms | 8.854 B | 0 | -10.645.504 B | 10.000.000 B |
| demais 8 superfícies | 1 | 200 | 534,96–564,08 ms | 8.859–8.879 B | 0 | -9.404.416 a -6.553.600 B | 10.000.000 B |
| auditoria paginada | 25 | 200 | 542,63 ms | 8.854 B | 0 | -3.272.704 B | 10.000.000 B |

P95 local observado: **830,64 ms**. Sem assets originais carregados e sem cache remoto. Não há SQL acumulado mensurado pelo harness (`0`) nem evidência de N+1.

Limitação decisiva: todos os cenários registraram `renderedItems: 0`, inclusive 25/50/100. Assim, os valores HTTP são reais, mas a carga declarada não foi materializada; esta medição não aprova a performance representativa desses volumes.
