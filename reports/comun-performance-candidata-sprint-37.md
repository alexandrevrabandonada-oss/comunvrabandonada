# Performance local da candidata — Sprint 37

Medição em `next start`, sete amostras por rota, máquina local. Valores são indicativos, não SLO de produção.

| Rota | HTTP | média | p95 | bytes |
|---|---:|---:|---:|---:|
| `/comun` | 200 | 67,5 ms | 123,1 ms | 59.885 |
| `/comun/c/cidade` | 200 | 30,3 ms | 34,9 ms | 48.842 |
| pauta fixture | 200 | 101,9 ms | 413,9 ms | 68.489 |
| `/comun/mapa` | 200 | 26,2 ms | 33,3 ms | 24.535 |
| `/comun/criar-conta` | 200 | 10,9 ms | 12,2 ms | 19.550 |
| `/comun/buscar?q=calcadas` | 200 | 22,1 ms | 28,5 ms | 22.749 |
| `/comun/resultados` | 200 | 14,0 ms | 16,2 ms | 18.084 |
| `/comun/offline` | 200 | 3,5 ms | 5,3 ms | 14.478 |

Rotas privadas devolveram 307 sem sessão, comportamento esperado. Processo: aproximadamente 198 MB RSS. O código agrega consultas independentes com `Promise.all`, mas não houve instrumentação de banco suficiente para afirmar ausência total de N+1. Nenhum gargalo bloqueante foi comprovado no percurso público; o p95 da pauta merece observação futura.

Declarações: piloto **não aberto**; integração na `main`, push e deploy **não executados**; serviços remotos **inalterados**; R2 real/dados reais **não utilizados**; custo externo **R$ 0**.
