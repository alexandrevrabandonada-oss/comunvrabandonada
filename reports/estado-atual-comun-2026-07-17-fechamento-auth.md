# Estado atual do projeto — COMUN

Data: 17/07/2026. Escopo: fotografia técnica local após o fechamento parcial da Sprint 33.2.1. Este documento não autoriza piloto público, deploy, push, alteração remota, uso de R2 real ou dados reais.

## Decisão atual

| Dimensão | Estado | Justificativa |
|---|---|---|
| Técnico local | **NO-GO parcial** | Gates isolados passaram, mas reset duplo, production-like, performance e regressões completas ainda não foram aprovados. |
| Readiness humano | **NO-GO** | `COMUN_PILOT_HUMAN_READINESS_INCOMPLETE` permanece sem confirmações humanas. |
| Promoção remota | **NO-GO** | Nenhuma revisão remota, push ou deploy foi executado. |
| Piloto público | **NÃO ABERTO** | Fora do escopo desta verificação. |

## Evidências aprovadas no worktree isolado

Worktree: `C:\Projetos\comun-auth-closeout-local` na branch local `codex/comun-auth-closeout-local`.

| Gate | Resultado |
|---|---|
| Contrato de seed | PASS — `supabase/seed.sql` versionado, vazio e documentado; nenhuma fixture ou dado permanente. |
| Ambiente local | PASS — Node 22.19.0, Storage pronto, Auth pronto, `RLS_MATRIX_OK` e DB lint sem erro. |
| E2E autenticado | PASS — 42/42, duas execuções. |
| Axe autenticado | PASS — 15/15, duas execuções, sem violações serious/critical. |
| Visual autenticado | PASS — 15/15. |
| Independência | PASS — ordem E2E → Axe → visual → Axe → E2E, com `COMUN_TEST_FIXTURES_CLEAN` em cada encerramento. |
| Lint | PASS sem erros; há 2 avisos de export anônimo nos wrappers globais. |
| Typecheck | PASS no worktree limpo, sem o diff paralelo de media-storage. |
| Unitários | PASS — 192/192 no worktree limpo. Os 6 restantes pertencem ao teste paralelo não rastreado de media-storage e não foram incorporados. |
| Build | PASS — Next.js 16.2.10 concluiu a compilação e geração das rotas. |

## Correções locais realizadas

- Autenticação e fixtures: storageState só é persistido após login, cookie, identidade e rota protegida validados.
- Os hooks globais de E2E/Axe/visual estabelecem o contrato localhost antes de readiness e teardown.
- `auth:readiness:local` e comandos de fixtures são autocontidos no ambiente local.
- Telemetria do CLI foi desativada no lançador local.
- O runner de reset passou a ter buffer de logs suficiente e a iniciar/encerrar um `next dev` próprio por rodada.

## Estado do reset

O Reset 1 **não está aprovado**.

1. A primeira tentativa confirmou reset, Storage, unitários e E2E, mas o runner excedeu o buffer de saída durante o Axe. O Axe isolado posterior passou 15/15; o runner foi corrigido.
2. A tentativa seguinte confirmou E2E, Axe e visual, mas os smokes falharam porque não havia servidor após o Playwright encerrar o web server. O runner foi corrigido para manter um servidor local por rodada.
3. A última tentativa parou no `supabase db reset --local` com 502 transitório de Kong para Storage durante o restart. Após o evento, banco, Kong, Auth, Storage e PostgREST voltaram saudáveis. Não houve alteração de rede, secrets ou serviços remotos.

Ainda faltam: Reset 1 verde, Reset 2 verde, `next start` completo, performance real e a matriz integral de regressões.

## Integridade dos workspaces

O worktree original `C:\Projetos\COMUM VR ABANDONADA` permanece com trabalho paralelo preservado:

- seed não rastreado em `supabase/seed.sql`;
- alterações de `lib/media-storage/*` e `.env.example`;
- screenshots e artefatos de teste locais;
- arquivos de diagnóstico e relatórios não rastreados.

Nada foi descartado, sobrescrito, incluído seletivamente por engano, limpo com `git clean` ou resetado com `git reset --hard`.

## Observabilidade

O container local `vector` continua em ciclo de reinício por `Network unreachable` ao consultar `docker_host`. A classificação continua sendo **opcional para os gates locais atuais**: banco, Auth e Storage não dependem dele. Não foi alterada rede, configuração do Vector ou Docker para contornar esse ponto.

## Commits locais relevantes no worktree de fechamento

- `7b7c19c` — seed local independente de trabalho paralelo.
- `ec32016` — gates Auth autocontidos no ambiente local.
- `4d14631` — captura de logs de reset ampliada.
- `a70b371` — servidor local durante regressões de reset.

## Declarações de escopo

- Git push: **NÃO EXECUTADO**.
- Deploy: **NÃO EXECUTADO**.
- Supabase remoto: **NÃO ALTERADO**.
- R2 real: **NÃO UTILIZADO**.
- Serviços externos do projeto: **NÃO UTILIZADOS**.
- Dados reais: **NÃO UTILIZADOS**.
- Custo externo: **R$ 0**.
