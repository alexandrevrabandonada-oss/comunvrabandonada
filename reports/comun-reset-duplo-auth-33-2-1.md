# Reset duplo autenticado — Sprint 33.2.1

| Critério | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| Run id | `auth-reset-1-20260717211800` | `auth-reset-2-20260718005114058` |
| Commit | `b141f4c` | `c33297b` |
| Reset/migrations | 52/52 | 52/52 |
| Classificação | B — Auth/Kong transitório | B — Storage transitório |
| Recovery | 12,8 s após restart restrito | 56,9 s por polling |
| Restart | Kong, uma vez, recuperado em 15,5 s | nenhum |
| E2E / Axe / visual | 42 / 15 / 15 PASS | 42 / 15 / 15 PASS |
| Cleanup / assert | PASS | PASS |

As rodadas usaram resets reais, run ids distintos e processos Next próprios. As fixtures, sessões e storage states foram limpos ao fim de cada bateria (`COMUN_TEST_FIXTURES_CLEAN`). Não há evidência de reutilização de usuário, cookie, processo, token ou fixture entre elas.

O 502 não foi aceito automaticamente: cada rodada exigiu migrations completas, banco/REST/Kong/Auth/Storage saudáveis em duas leituras consecutivas, readiness, lint, RLS e a bateria posterior aprovada.
