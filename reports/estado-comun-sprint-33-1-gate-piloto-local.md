# Sprint 33.1 — gate operacional local do piloto

Data: 16/07/2026. Decisão: **NO-GO para abrir o piloto público** e **NO-GO para promoção remota**.

## Resultado

- checkpoint e guardas: aprovados; localhost, `DO_NOT_TRACK=1`, Storage local, DB lint e RLS;
- matriz executável: 15 personas, 18 ações, falha fechada e separação de poderes cobertas por unitários;
- Playwright: 15/15 em cada rodada vigente e em `next start`, cobrindo visitante, proteção, Axe e responsividade em cinco viewports;
- Axe: 5/5, zero serious/critical na superfície protegida;
- visual: cinco capturas revisadas, sem overflow; superfícies autenticadas ainda não exercitadas por sessão de cada persona;
- backup/restore: dump real local, migrations em banco descartável, restore de dados, relações/grants conferidos e destruição; `COMUN_LOCAL_RESTORE_OK`;
- exportação: allowlist e ausência de campos privados; `COMUN_PAUTA_EXPORT_SANITIZED_OK`;
- incidentes: 12/12 contidos em estado seguro; cleanup;
- capacidade: 25/50/100 itens, paginação e filas medidas; limite recomendado de 25 entradas/dia;
- escala e plantão: modelos documentados, mas titulares/substitutos e canal real não confirmados;
- rehearsal: abertura, operação e fechamento sintéticos passaram;
- unitários: 25 arquivos, 178/178 em duas rodadas;
- reset 1: aprovado integralmente;
- reset 2: migrations aplicadas; 502 conhecido pós-reset recuperado por restart restrito de PostgREST/Kong; gates repetidos e aprovados;
- production-like: build e `next start`; E2E final 15/15, rehearsal, incidentes, restore, no-leak e cleanup aprovados;
- cleanup: `COMUN_TEST_FIXTURES_CLEAN`, sem backup ou banco descartável remanescente.

## Regressões

| Fluxo | Resultado | Duração aproximada | Cleanup |
| --- | --- | ---: | --- |
| first-pilot-rehearsal | passou | <1 s | limpo |
| editorial-operation | passou | <1 s | limpo |
| sidewalk-pilot | passou | lote 118 s | limpo |
| central-experience | passou | lote 118 s | limpo |
| pauta-miniapp | passou | lote 118 s | limpo |
| community-radio | passou | lote 118 s | limpo |
| territorial-art-storage | passou | lote 118 s | limpo |
| territorial-art | passou | lote 118 s | limpo |
| community-auth:local | passou | lote 118 s | limpo |
| public-ui:local | passou | lote 118 s | limpo |
| no-leak-http | passou | lote 118 s | limpo |

## Bloqueios humanos

Faltam responsáveis e substitutos reais, canal de plantão, revisão do ambiente remoto e E2E autenticado de todas as personas/superfícies operacionais. O código local nunca transforma ausência desses itens em abertura automática.

## Declarações

- Piloto público real: NÃO ABERTO
- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Serviços externos: NÃO UTILIZADOS
- Dados reais: NÃO UTILIZADOS
- Protocolos reais: NÃO ENVIADOS
- Mensagens reais: NÃO ENVIADAS
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0

## Atualização Sprint 33.2

Foram adicionadas 14 sessões Auth operacionais reais, autorização server-side e E2E 15/15 em duas rodadas. O NO-GO permanece por prontidão humana incompleta e lacunas técnicas registradas no relatório 33.2.
