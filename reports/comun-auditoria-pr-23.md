# Auditoria técnica final da PR #23

Data: 2026-07-21

Comparação: `origin/main...codex/sprint-40-1-mobile-preview`

Estado auditado antes do commit final: `1001d5cb3a70a380ca19a437d8297dc00d5e8b18`

## Resultado

O lote de estabilização fechou as regressões encontradas sem abrir sprint, criar nova PR ou alterar o produto remotamente. A linha candidata consolida o Mapa das Calçadas, MapLibre/PMTiles, captura rápida, upload privado em duas fases, encaminhamento operacional, portal móvel e jornadas de comunidade. Os contratos E2E foram alinhados à semântica canônica vigente e a cadeia autenticada voltou a cobrir fotografia, registro, moderação, prioridade, protocolo fixture, resultado e memória.

## Escopo e redução de evidências

- Delta final contra `origin/main`: 192 arquivos.
- Arquivos em `reports`: 82.
- Imagens no delta: 21; o lote removeu 152 das 158 imagens regeneráveis recém-adicionadas pela candidata e preservou seis evidências representativas das Sprints 37 e 39.
- `test-results/.last-run.json` foi removido.
- Traces, relatórios Playwright, caches, sessões e storage states permanecem fora do Git.

## Migrations, RLS e privacidade

As quatro migrations da candidata mantêm ordem e timestamps únicos. A matriz retornou `RLS_MATRIX_OK`; `supabase db lint --local` retornou zero erros. Não foram encontrados `.env`, segredos reais, service-role keys, sessões, dumps, fotos reais ou dados pessoais no delta preparado. Toda execução usou Supabase local.

## PMTiles

- Arquivo: `public/maps/volta-redonda/volta-redonda.pmtiles`
- Tamanho: 10.147.678 bytes, abaixo do limite de revisão de 25 MiB.
- SHA-256: `d0512669d6c01cbffbc513837e30ac926ef124727feeaa12b91d9be04cd635b9`.
- HTTP Range production-like: `206`, `bytes 0-99/10147678`.
- Política: versionamento excepcional para o primeiro piloto; artefato substituível.
- Manifesto: nomes, URLs de proveniência e caminhos relativos portáveis; nenhum caminho absoluto de máquina.
- Fontes: OpenStreetMap/ODbL 1.0 e IBGE, com atribuições preservadas.

## Regressão consolidada

| Suíte | Antes | Depois | Decisão | Cleanup |
| --- | ---: | ---: | --- | --- |
| Typecheck | aprovado | aprovado | verde | n/a |
| Lint | aprovado | aprovado | verde | n/a |
| Unitários | 252/252 | 253/253 | verde | n/a |
| RLS / DB lint | aprovados | aprovados | verde | banco local |
| Build Next 16.2.10 | aprovado | aprovado, 92 páginas estáticas | verde | n/a |
| Mapa real/captura | 46 pass, 4 skips | 46 pass, 4 skips intencionais | verde | fixtures locais |
| Miniapps | 10 falhas | 10/10 | corrigido | `COMUN_TEST_FIXTURES_CLEAN` |
| Shell móvel | 9/9 | 9/9 | verde | Playwright |
| Jornada integral | 5 pass, 5 falhas | 10/10 em cinco viewports | corrigido | `COMUN_TEST_FIXTURES_CLEAN` |
| PWA | 17 pass, 3 falhas | 20/20 | corrigido | Playwright |
| Comunidades | 30 pass, 5 falhas | 35/35 | corrigido | fixture persistente limpa |
| Primeiro piloto | 10 pass, 5 falhas | 15/15 | corrigido | `COMUN_TEST_FIXTURES_CLEAN` |
| Operação editorial autenticada | 45/45 | 45/45 | verde | `COMUN_TEST_FIXTURES_CLEAN` |
| No-leak HTTP | aprovado | aprovado | verde | fixture removida |
| Cleanup final | aprovado | `COMUN_TEST_FIXTURES_CLEAN` | verde | confirmado |

## Production-like local

`/comun`, `/comun/explorar`, `/comun/calcadas` e `/comun/participar` responderam 200. `/comun/minha-participacao` e `/comun/caixa-de-entrada` responderam 307, como esperado sem sessão. O PMTiles respondeu 206 ao pedido Range. O smoke HTTP não encontrou `service_role`, geometria privada ou chave de original na superfície pública verificada.

## Limites mantidos

Nenhum merge, deploy, acesso ao Supabase remoto, alteração no R2 ou provider cartográfico remoto foi executado. Câmera/GPS continuam validados por simulação; dispositivos físicos e gate humano permanecem pendentes.
