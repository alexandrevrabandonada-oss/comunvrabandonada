# Estado atual consolidado — COMUN

Data: 17/07/2026. Este relatório é uma fotografia local e não autoriza piloto público, integração, push, deploy, alteração remota ou uso de dados reais.

## Resumo executivo

O projeto tem uma bateria autenticada local robusta concluída em worktree isolado, mas esse fechamento ainda **não foi integrado** ao worktree principal. A funcionalidade local principal passou os gates de reset duplo, recuperação, segurança e `next start`; continuam bloqueadas a promoção humana/remota e a comprovação de performance sob carga representativa.

## Estado por camada

| Camada | Estado | Evidência |
| --- | --- | --- |
| Worktree principal | Em trabalho paralelo | Branch `codex/comun-admin-auth-remote`, HEAD `4ba631d`; alterações locais preservadas. |
| Fechamento Auth isolado | Funcionalmente aprovado | Worktree `C:\Projetos\comun-auth-closeout-local`, commits `c33297b`, `a38e90a`, `7ad87b3`. |
| Reset e recovery | PASS | Duas rodadas com 52/52 migrations e polling controlado. |
| Regressões autenticadas | PASS | E2E 42/42, Axe 15/15, visual 15/15; cleanup confirmado. |
| Qualidade local | PASS | 199/199 unitários, lint, typecheck, build, DB lint e `RLS_MATRIX_OK`. |
| Production-like | PASS | Build novo e `next start` concluíram a bateria autenticada integral. |
| Performance 25/50/100 | PENDENTE | O harness coletou tempos HTTP, mas não materializou os itens (`renderedItems: 0`). |
| Readiness humana | NO-GO | `COMUN_PILOT_HUMAN_READINESS_INCOMPLETE`. |
| Promoção remota/piloto público | NO-GO | Sem revisão humana/remota; piloto não aberto. |

## Incidente local de reset

Foram observados 502 transitórios pós-`supabase db reset --local`, classificados como recuperação controlada: migrations concluídas, todos os serviços obrigatórios recuperados e gates posteriores aprovados. Na primeira rodada houve uma única reinicialização restrita do Kong, baseada em evidência de upstream; na segunda, Storage recuperou apenas pelo polling. Banco, Auth, Docker Desktop, secrets e rede não foram reiniciados/alterados.

## Alterações paralelas preservadas no worktree principal

Permanecem sem modificação por este relatório: `.env.example`, `lib/media-storage/index.ts`, `lib/media-storage/index.test.ts`, `supabase/seed.sql`, `package.json`, `next-env.d.ts`, screenshots de regressão e `test-results/`. O estado sujo impede considerar o worktree principal pronto para integração automática.

## Observabilidade

Vector local permanece opcional para os gates locais e reinicia por indisponibilidade de `docker_host`. Não há impacto comprovado em banco, Auth ou Storage; a pendência deve ser tratada antes de eventual promoção remota, sem mascaramento de rede.

## Decisão atual

- Técnico funcional local: aprovado para o escopo autenticado, exceto a carga 25/50/100 ainda não comprovada.
- Técnico de promoção: NO-GO enquanto performance representativa e integração limpa não forem fechadas.
- Humano: NO-GO.
- Remoto e piloto público: NO-GO.

## Declarações

- Git push: NÃO EXECUTADO.
- Deploy: NÃO EXECUTADO.
- Supabase remoto: NÃO ALTERADO.
- R2 real e serviços externos: NÃO UTILIZADOS.
- Dados reais: NÃO UTILIZADOS.
- Custo externo: R$ 0.

Fontes locais: `reports/estado-atual-comun-2026-07-17-fechamento-auth.md` e, no worktree isolado, `reports/comun-fechamento-auth-reproducivel-33-2-1.md`, `reports/comun-reset-duplo-auth-33-2-1.md`, `reports/comun-production-like-auth-33-2-1.md` e `reports/comun-performance-operacao-autenticada-33-2-1.md`.
