# Reconciliação dos commits históricos da PR #23

Não houve cherry-pick integral. A comparação foi semântica contra o HEAD canônico da PR.

| Commit antigo | Arquivo/função | Equivalente atual | Estado | Ação |
|---|---|---|---|---|
| `7be997a` | `.env.example`, `lib/media-storage/index.ts` e teste | abstração atual em `lib/media-storage/*`, coberta por testes e smokes locais de storage | SUPERSEDED_BY_CANONICAL | Nenhum port. |
| `7be997a` | `scripts/diag-comun-auth-reset-33-2-1.mjs` | diagnóstico e resets autenticados preservados em `scripts/diag-comun-auth-reset*.mjs` e rotinas finais | SUPERSEDED_BY_CANONICAL | Nenhum port. |
| `7be997a` | `supabase/seed.sql` | seed e fixtures locais atuais, com cleanup e assert-clean | SUPERSEDED_BY_CANONICAL | Não recuperar seed histórico isolado. |
| `7be997a` | quatro relatórios de fechamento 33.2.1 | relatórios canônicos posteriores de autenticação, operação e estado consolidado | DOCUMENTATION_ONLY | Histórico reconhecido; sem duplicação. |
| `7be997a` | 39 screenshots 33.2.1 | evidência visual posterior e testes reproduzíveis | DOCUMENTATION_ONLY | Remover duplicatas regeneráveis da PR. |
| `7be997a` | `test-results/.last-run.json` | artifact local/CI ignorado | TEST_ONLY | Não versionar. |
| `2477c90` | fila operacional: página, helper, migration e configuração | implementação canônica de filas/paginação presente no HEAD, incluindo migration `20260718031145_operational_queue_pagination.sql` | SUPERSEDED_BY_CANONICAL | Nenhum port de produção. |
| `2477c90` | config e teste Playwright de paginação, personas e setup | suítes editoriais autenticadas atuais aprovadas | TEST_ONLY | Manter implementação canônica. |
| `2477c90` | `.gitignore`, Next/TS/ESLint | configurações atuais incorporam os ajustes compatíveis | SUPERSEDED_BY_CANONICAL | Nenhum port. |
| `2477c90` | diagnóstico/readiness/reset JSON | relatórios posteriores e gates atuais | DOCUMENTATION_ONLY | Preservar somente documentação canônica. |
| `2477c90` | 39 screenshots 33.2.1 | evidência reproduzível posterior | DOCUMENTATION_ONLY | Aplicar política de evidências. |
| `2477c90` | `test-results/.last-run.json` | artifact local/CI ignorado | TEST_ONLY | Não versionar. |

Conclusão: não foi identificada funcionalidade de produção ausente que justifique `REQUIRES_TARGETED_PORT`.
