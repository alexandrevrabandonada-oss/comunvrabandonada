# Performance local — Calçadas, Sprint 37

Medição do núcleo de projeção, recorte e agrupamento em 200 rodadas, sem rede externa:

| Pontos | Payload | P95 | Grupos | Itens máximos renderizados |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 2 B | 0,001 ms | 0 | 0 |
| 25 | 602 B | 0,032 ms | 24 | 25 |
| 100 | 2.419 B | 0,054 ms | 93 | 100 |
| 500 | 12.091 B | 0,275 ms | 93 | 100 |

Memória do processo: 4,05 MB. Chamadas externas: zero. A consulta pública limita a 100 registros e não carrega fotos originais. O resultado mede o motor local isolado; tempo de banco e renderização completa em `next start` ainda precisa de rodada final.
