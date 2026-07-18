# Checkpoint de integração — Sprint 33.2.1

Data: 17/07/2026. Registro somente local; nenhum cherry-pick, merge, push ou deploy foi realizado.

| Worktree | Branch / HEAD | Estado |
| --- | --- | --- |
| Principal | `codex/comun-admin-auth-remote` / `4ba631d` | Sujo: `.env.example`, `lib/media-storage/index.ts`, `next-env.d.ts`, `package.json`, screenshots; não rastreados de media-storage, seed, relatórios e `test-results`. |
| Fechamento isolado | `codex/comun-auth-closeout-local` / `7ad87b3` | Somente artefatos gerados de visual/reset e `test-results`; não são candidatos a integração. |

O principal preserva `supabase/seed.sql`, media-storage, package manifests e relatórios paralelos. Eles não serão sobrescritos. O fechamento isolado possui 12 commits exclusivos, de `7b7c19c` a `7ad87b3`.

Ambos usam a mesma base local do Supabase, com 52 migrations aplicadas. O inventário de integração posterior deve tratar os arquivos paralelos do principal como fora de escopo.
