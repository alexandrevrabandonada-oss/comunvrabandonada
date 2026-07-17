# Inventário de diffs paralelos — Sprint 33.2.1

Data: 17/07/2026. Worktree inventariado: `C:\Projetos\COMUM VR ABANDONADA`. Commit-base preservado: `9cbd27e629c8c7555706be0b3e15ab5c582f8ab8` (`codex/comun-admin-auth-remote`).

Este inventário foi feito antes da criação do worktree limpo. Nenhum item paralelo foi removido, sobrescrito, adicionado ao staging ou levado ao worktree de fechamento.

| Classe | Arquivos observados | Tratamento |
|---|---|---|
| A. Auth e sessões | Nenhum diff não commitado. | A correção Auth já está no histórico local, principalmente em `6fd6482`; revisão será feita por commit. |
| B. testes autenticados | Nenhum diff não commitado. | Suites e fixtures Auth já estão commitadas; não há hunk a selecionar no worktree original. |
| C. documentação Auth | Nenhum diff não commitado antes deste inventário. | Relatórios commitados serão atualizados somente no fechamento isolado. |
| D. screenshots Auth | 43 capturas modificadas sob `reports/screenshots/sprint-33-2-1-*.png`. | Preservadas no worktree original; não entram em commits de fechamento sem revisão visual específica. |
| E. seed paralelo | `supabase/seed.sql` (não rastreado). | Preservado e não copiado. O worktree limpo corrigirá apenas o contrato versionado ausente, se necessário. |
| F. media-storage paralelo | `.env.example`, `lib/media-storage/index.ts` (modificados); `lib/media-storage/index.test.ts` (não rastreado). | Preservados; não entram no commit Auth nem no typecheck isolado. |
| G. alteração desconhecida | `package.json` (marcado modificado sem diff textual); `reports/comun-checkpoint-fechamento-33-2-1.md`, `reports/comun-diagnostico-auth-reset-33-2-1.md`, `reports/estado-atual-comun-2026-07-17.md`, `scripts/diag-comun-auth-reset-33-2-1.mjs` (não rastreados). | Não modificar, não adicionar e não descartar até identificação do responsável. |
| H. gerado temporário | `next-env.d.ts` (modificado); `test-results/.last-run.json` (não rastreado). | Preservados no worktree original; não entram em commits. |

## Garantias de preservação

- Não foi usado `git clean`, `git reset --hard` nem stash global.
- O estado paralelo permanece exclusivamente neste worktree original.
- O worktree de fechamento será criado a partir do commit-base acima; assim, não conterá seed paralelo, media-storage, screenshots modificados, `.local` ou artefatos temporários deste inventário.
