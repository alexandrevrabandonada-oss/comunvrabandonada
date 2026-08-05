# Matriz de prontidão para piloto — 48.0M

| domínio | estado | evidência | limite |
|---|---|---|---|
| captura rápida | ready_with_limit | E2E 10/10 | humano pendente |
| Carteira | ready_with_limit | DB + E2E/Axe 5/5 | humano pendente |
| Calçadas | ready_with_limit | DB/RLS/Axe; smoke verde | fixture canônica de E2E pendente |
| Ônibus | ready_with_limit | DB + E2E/Axe 5/5 | piloto real fechado |
| Fiscaliza | ready_with_limit | adaptador local e abertura assistida | autenticação/operação não observadas |
| STMU WhatsApp | ready_with_limit | menu vivo já observado, DB verde | opção 3 pendente, sem submissão |
| STMU e-mail | ready_with_limit | fonte oficial reconciliada | e-mail neutro não enviado |
| acessibilidade | ready_with_limit | Axe automatizado | aparelhos reais pendentes |
| segurança/no-leak | ready | RLS, grants, cloak, smoke | nenhum segredo remoto usado |
| rollback | ready | flags cumulativas e legado preservado | ativação pública proibida |
| suporte/plantão | not_tested | fora do escopo técnico | definir antes de 48.1 |

## Separação dos gates 48.1A

| gate | estado | evidência |
|---|---|---|
| código integrado | green | PR #171 mesclada no merge SHA `1d877449…` |
| permissão programática | parcial | CLI lista o projeto; MCP recebe permission denied |
| leitura remota | bloqueada | schema privado, ledger, RLS e grants não comprovados |
| ensaio humano | incompleto | `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE` |
| autorização de piloto | fechada | nenhuma allowlist, flag ou participante criado |

Conclusão: não pronto para piloto público nem piloto allowlisted; pronto
somente como infraestrutura dormente. O próximo passo é corrigir a permissão
read-only do conector sem compartilhar segredos.
