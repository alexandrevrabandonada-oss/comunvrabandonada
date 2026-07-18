# Plano de integração Auth

| Classe | Origem | Destino | Estratégia |
|---|---|---|---|
| A | `7b7c19c`–`b141f4c` | scripts/fixtures/reports Auth | Cherry-pick em ordem, em worktree limpo; dependem de seed local isolado. |
| A | `c33297b` | contrato/reset runner | Cherry-pick após os fixes de reset. |
| A | `a38e90a` | verificador `next start` | Cherry-pick após o runner Auth. |
| A | factory e harness desta fase | performance local | Commit separado; não toca media-storage. |
| D | `7ad87b3` e relatórios | reports | Aplicar somente depois da validação. |
| C/F | `.env.example`, `lib/media-storage/*`, `supabase/seed.sql`, package files | principal | Não integrar automaticamente: trabalho paralelo. |
| E | screenshots, `test-results`, JSON transitório | nenhum | Não integrar. |

Conflito previsto: `package.json` e `supabase/seed.sql` diferem no principal. Abortável: `git cherry-pick --abort`. Testes posteriores: lint, typecheck, unitários, Auth readiness, E2E/Axe, RLS, DB lint e cleanup.
