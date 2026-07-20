# Performance integral das calçadas — Sprint 37.2

Data: 20 de julho de 2026

## Ambiente

| Item | Evidência |
|---|---|
| Commit medido | `70656afa808d85f7c0dd979a48f9a37a5bca7b30` |
| Build | Next.js 16.2.10, aprovado |
| Servidor | `next start`, porta local 3000 |
| PID efetivo | `17416` |
| Início | 20/07/2026 20:03:43 (America/Sao_Paulo) |
| Auth readiness | `COMUN_LOCAL_AUTH_READY` |
| Storage readiness | `COMUN_LOCAL_STORAGE_READY` |
| RSS após jornada | 200,15 MB |
| Memória privada | 203,26 MB |

## Mapa sob carga

Dez requisições por volume. A carga `perf-s37-2-*` foi criada somente para
leitura de performance e removida imediatamente depois.

| Superfície | Itens | HTTP | Payload | Queries relacionadas | SQL acumulado | Média | P95 | RSS | Heap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mapa/clustering/lista | 25 | 200 | 81.067 B | 50/10 req. | 5,90 ms | 67,61 ms | 208,40 ms | 200,15 MB | 5,73 MB¹ |
| mapa/clustering/lista | 100 | 200 | 126.963 B | 50/10 req. | 13,44 ms | 34,92 ms | 43,09 ms | 200,15 MB | 5,73 MB¹ |
| mapa/clustering/lista | 500 | 200 | 126.962 B | 50/10 req. | 17,53 ms | 35,10 ms | 39,10 ms | 200,15 MB | 5,73 MB¹ |

¹ Heap do benchmark isolado de clustering. O Node do `next start` expôs RSS e
memória privada pelo sistema operacional, não heap interno.

O número de statements permaneceu constante com 25, 100 e 500 registros. O
payload de 500 não cresceu em relação a 100 porque a consulta pública limita 100
registros. O benchmark de 200 rodadas agrupou 500 pontos em 93 clusters e
renderizou no máximo 100 itens, P95 de 0,270 ms, sem requisição externa.

## Jornada production-like

Cinco amostras GET autenticadas por superfície, usando a persona e o estado
reais da jornada. Os dados completos estão em
`reports/comun-performance-calcadas-sprint-37-2.json`.

| Superfície | HTTP | Payload | Média | P95 |
|---|---:|---:|---:|---:|
| mapa/clusters | 200 | 62.556 B | 35,95 ms | 54,03 ms |
| lista/filtros | 200 | 59.738 B | 30,64 ms | 32,38 ms |
| ficha | 200 | 20.739 B | 23,53 ms | 24,94 ms |
| prioridade/roda | 200 | 21.218 B | 175,76 ms | 221,36 ms |
| pacote/mobilização | 200 | 16.649 B | 28,33 ms | 33,76 ms |
| encaminhamento | 200 | 27.768 B | 158,37 ms | 217,70 ms |
| protocolo | 200 | 26.854 B | 163,26 ms | 204,17 ms |
| resposta | 200 | 27.067 B | 144,51 ms | 154,48 ms |
| resultado | 200 | 27.421 B | 162,95 ms | 215,76 ms |
| memória publicada | 200 | 25.972 B | 153,17 ms | 158,38 ms |
| Minha área | 200 | 55.405 B | 90,73 ms | 97,63 ms |
| Inbox | 200 | 41.669 B | 78,74 ms | 82,80 ms |

## Auditoria estrutural

- mapa carrega registros, fotos e relações em consultas de lote;
- nenhuma consulta é emitida por marcador ou card;
- fotografia original e `object_key` não integram a projeção pública;
- geometria privada não integra `publicFields`;
- relações do pacote são carregadas com `Promise.all` e conjuntos de IDs;
- quantidade de queries do mapa permaneceu constante sob carga;
- clustering limita o DOM a 100 itens;
- pacote passou no-leak e as asserções de sanitização.

`COMUN_SIDEWALK_PERFORMANCE_PRODUCTION_LOCAL_OK`

Nenhum tile remoto, dado real, R2 ou protocolo real foi utilizado. Custo externo:
**R$ 0**.

