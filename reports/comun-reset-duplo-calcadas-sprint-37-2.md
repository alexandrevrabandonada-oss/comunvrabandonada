# Reset duplo — Sprint 37.2

Data: 20 de julho de 2026. Escopo estritamente local.

## Resultado

| Rodada | runId | Commit de partida | Duração | Blocos | Resultado |
| --- | --- | --- | ---: | ---: | --- |
| 1 | `sidewalk-reset-1-48aed15e-5820-4978-89e1-85a7889b31e4` | `cb76df8` | 30m41s | 24/24 | `COMUN_SIDEWALK_REAL_MAP_RESET_1_OK` |
| 2 | `sidewalk-reset-2-fd0d3213-a643-4d62-a7f9-ba10f09124b9` | `cb76df8` | 31m34s | 24/24 | `COMUN_SIDEWALK_REAL_MAP_RESET_2_OK` |

Cada rodada começou com `supabase db reset --local`, criou um `runId` novo e executou readiness de Storage/Auth, 245 testes unitários, RLS, DB lint, mapa real, piloto, primeira participação, experiência integral, PWA, comunidades, Auth, experiência central, operação editorial, performance de clustering, cleanup, assert-clean, build, jornada contra `next start`, miniapp, no-leak e nova limpeza.

As evidências estruturadas estão em `comun-reset-1-calcadas-sprint-37-2.json` e `comun-reset-2-calcadas-sprint-37-2.json`. Nenhum usuário, sessão, objeto ou dado operacional foi reutilizado entre rodadas.

## Regressões

| Suíte | Rodada 1 | Rodada 2 | Fixtures limpas |
| --- | ---: | ---: | --- |
| sidewalk-real-map | 51,7s | 51,8s | sim |
| sidewalk-pilot | 166,5s | 185,6s | sim |
| primeira-participação | 245,4s | 239,3s | sim |
| experiência integral; Minha área; Inbox | 421,4s | 427,5s | sim |
| PWA | 33,6s | 31,1s | sim |
| comunidades | 100,1s | 97,4s | sim |
| Auth | 31,2s | 30,9s | sim |
| experiência central; busca | 101,7s | 99,0s | sim |
| operação editorial | 302,8s | 320,9s | sim |
| production-like, miniapp e no-leak | 185,3s | 196,7s | sim |

Resultado final: `COMUN_TEST_FIXTURES_CLEAN` nas duas rodadas.
