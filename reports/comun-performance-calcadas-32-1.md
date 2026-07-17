# Performance local — calçadas 32.1

Medição contra `next start`, três requisições por superfície, fixture sintético e localhost. Valores incluem aquecimento local e não representam produção remota.

| Superfície | HTTP | Média | Payload |
| --- | ---: | ---: | ---: |
| Pauta | 200 | 54 ms | 63.839 B |
| Mapa/lista | 200 | 51 ms | 63.796 B |
| Detalhe | 200 | 33 ms | 19.344 B |
| Contribuição | 200 | 47 ms | 63.839 B |
| Upload | 200 | 3 ms | 18.932 B |
| Observatório | 200 | 41 ms | 63.839 B |
| Minha Participação | 200 | 16 ms | 15.301 B |
| Caixa de entrada | 200 | 15 ms | 15.287 B |
| Território | 200 | 29 ms | 20.672 B |
| Memória | 200 | 19 ms | 16.525 B |

Sharp: 34 ms, derivada sintética de 1.290 B, delta de RSS aproximado de 1.802.240 B. O smoke comprovou original e derivada reais no Storage local e cleanup posterior.

Consultas independentes da pauta são paralelizadas com `Promise.all`. A leitura pública usa seleções explícitas; não foi observado N+1 nas superfícies medidas. Nenhum gargalo comprovado justificou otimização adicional.
