# Suítes Auth independentes — Sprint 33.2.1

Ambiente local isolado; sem push, deploy, acesso remoto, dado real ou custo externo.

## Resultado atualizado

| Suíte | Reset 1 | Reset 2 | `next start` |
|---|---:|---:|---:|
| Unitários | 192/192 | 199/199 | pré-validado |
| E2E autenticado | 42/42 | 42/42 | 42/42 |
| Axe autenticado | 15/15 | 15/15 | 15/15 |
| Visual autenticado | 15/15 | 15/15 | 15/15 |
| Cleanup/assert | PASS | PASS | PASS |

Cada bateria usou reset real, processo Next próprio, personas efêmeras e teardown. A nova cobertura unitária do contrato testa reset verde, 502 recuperado, migration incompleta, timeout, limite de restart, log truncado e evidência de execução. O total atual é 199/199.

Vector continua opcional para os gates locais e reinicia por indisponibilidade de `docker_host`; não foi alterado e deve ser revisto antes de qualquer promoção remota.
