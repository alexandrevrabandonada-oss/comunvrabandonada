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

Conclusão: não pronto para piloto público; pronto para ensaio humano controlado após correção focal da fixture.
