# Diagnóstico — instabilidade do Auth local no reset (Sprint 33.2.1)

**Data:** 2026-07-17
**Método:** leitura de evidências (`comun-reset-1-33-2-1.json`, `comun-production-like-33-2-1.json`), checkpoint do banco, diagnóstico instrumentado de 15 passos × 14 personas (`scripts/diag-comun-auth-reset-33-2-1.mjs`), reprodução com cadeia de redirects capturada, análise do código em `2a8a668`, `3a01e91` e working tree.

## Sintoma registrado

- Reset 1: `reset`, `storage`, `unit` e `e2e` passaram; **Axe falhou** após 211.015 ms.
- Production-like: `build` e `e2e` passaram; **Axe falhou** após 222.947 ms.
- As durações (~211 s / ~223 s) correspondem a ~5 testes estourando o timeout de 45 s — falha por timeout, não por erro imediato.

## Causa 1 — loop de redirects para personas viewer (reproduzida)

Cadeia capturada com persona `viewer` + `operational_role=operations_admin` (script de depuração temporário, depois removido):

```
307 /comun/admin -> /comun/admin/organizacao
307 /comun/admin/organizacao -> /comun/admin
307 /comun/admin -> /comun/admin/organizacao
... (loop até net::ERR_TOO_MANY_REDIRECTS)
```

Mecanismo:

1. `app/comun/admin/page.tsx`: `requireComunAdmin()` seguido de `redirect('/comun/admin/organizacao')` para **qualquer** admin ativo.
2. `app/comun/admin/organizacao/page.tsx`: `requireComunAdmin({roles:['admin','editor']})`; para role `viewer`, `lib/admin-auth.ts:58` executa `redirect("/comun/admin")`.
3. `/comun/admin` redireciona de novo para `organizacao` → loop infinito.

Extensão do problema: `/comun/admin/operacao` e `/comun/admin/operacao/superficies/[surface]` executam `redirect("/comun/admin")` quando a persona não tem a superfície exigida — também caem no loop. Pela matriz `lib/operational-authorization.ts`, apenas `admin`, `operations_admin` e `contribution_reviewer` acessam a "central".

**Impacto nos gates:** o setup de storageStates de `3a01e91` usava `redirect=/comun/admin` para **todas** as 13 personas admin; o pós-login entrava em loop para as 11 personas viewer sem acesso a `organizacao`. O check `pathname.startsWith("/comun/admin")` **passava mesmo durante o loop** (ambas as URLs alternadas satisfazem o prefixo), e o `storageState` era capturado em estado indeterminado de navegação. Com `waitForURL` + verificação funcional (working tree), o mesmo loop passou a derrubar o setup com `ERR_TOO_MANY_REDIRECTS` até a correção do destino.

**É também um bug de produto:** um admin real com role `viewer` que acessar `/comun/admin` diretamente cai no mesmo loop. Registrado como achado; correção de produto fora do escopo desta sprint (proibida nova funcionalidade). Contorno adotado nos testes: destino pós-login/verificação `/comun/admin/acervo` (guarda `requireComunAdmin()` sem filtro de papel) para todas as personas admin e `/comun/minha-participacao` para participant.

## Causa 2 — race na captura do storageState (versão `3a01e91`)

Fluxo commitado: `click()` em Entrar → leitura imediata de `page.url()` → `storageState()` sem `waitForURL` e sem abrir contexto novo para validar. Sob carga (dev server compilando, GoTrue frio após `db reset`, que **reinicia os containers**), o estado podia ser gravado antes da sessão estar navegável. Sem verificação funcional, a falha só aparecia dentro dos testes, como timeout de 45 s por teste — exatamente as durações observadas nos JSONs.

Em `2a8a668` (falha do production-like às 04:12) não havia setup global: `beforeAll` recriava as 14 personas **uma vez por projeto** (5 projetos) e cada teste fazia login via UI após `clearCookies()` — recriação sucessiva em rajada, a condição citada no relatório original.

## Causa 3 — instabilidade da infraestrutura Docker local (observada neste fechamento)

- Duas vezes durante este fechamento o **stack inteiro** do Supabase reiniciou no meio de execuções: uma durante o E2E (3 falhas esporádicas de `signInWithPassword` → "E-mail ou senha invalidos." → `toBeVisible` falhou), outra antes de um teste isolado (`container is not ready: starting`, run abortada).
- `supabase_vector` permanece em crash loop (não usado pelos gates).
- Esse comportamento explica falhas intermitentes "após recriação" que não se reproduzem em diagnóstico isolado.
- Mitigação adotada: gate `COMUN_LOCAL_AUTH_READY` antes de qualquer suíte e reexecução quando o stack está estável. Não é mascarado por sleeps: o readiness valida comportamento real (criar/logar/refresh/getUser/remover).

## Evidência de que o Auth em si está saudável

`scripts/diag-comun-auth-reset-33-2-1.mjs --all` após `supabase db reset --local`: **14/14 personas × 15 passos** (health → create → auth.users → identities → member_profile → admin_role → login → refresh → getUser → logout → cleanup → assert-gone → recreate → second-login → final-cleanup) sem nenhuma falha, ~3 s por persona. Recriação com mesmo e-mail e segundo login funcionam imediatamente.

Nota: consulta a `comun_member_profiles` com token `authenticated` retorna `permission denied` — comportamento **correto** de RLS, não falha de Auth.

## Causas secundárias (higiene de fixtures)

1. **Órfãos de `comun_member_profiles`:** `user_id uuid primary key` **sem FK** para `auth.users` (migration `20260715032613`). `deleteUser` não remove o perfil; o cleanup anterior nunca o removeu. Checkpoint encontrou **109 linhas órfãs**. Corrigido: `cleanupOperationalPersonas` agora remove `member_profiles` dos usuários fixture.
2. **`comun_admin_users` acumulado:** 92 linhas de 6+ runs interrompidos antes do teardown. O reset local (FASE 2) zerou; o cleanup por prefixo agora cobre qualquer run.
3. **Sem gate de Auth readiness:** suítes iniciavam com GoTrue possivelmente frio. Corrigido: `operational-global-setup.mjs` exige `COMUN_LOCAL_AUTH_READY` antes de criar personas.

## Hipóteses descartadas com evidência

| Hipótese | Evidência que descarta |
|---|---|
| E-mail reutilizado / UUID antigo / identity duplicada bloqueando recriação | 14/14 recriações com mesmo e-mail passaram |
| Perfil/papel órfão bloqueando | Upserts executaram sem conflito em todas as personas |
| Confirmação de e-mail | `email_confirmed_at` presente em todos |
| Senha divergente | Mesma constante; logins OK no diagnóstico |
| Token antigo / cache GoTrue | `getUser` com token novo OK em 14/14 |
| Rate limit (`sign_in_sign_ups=300/h`) | Bateria E2E+Axe consome ~110 sign-ins; abaixo do limite |
| Relógio/expiração | Tokens frescos validados; cookie `sb-127-auth-token` com expiração de ~1 ano |

## Correções aplicadas neste fechamento

1. `operational-global-setup.mjs`: gate `COMUN_LOCAL_AUTH_READY`; `waitForURL` pós-login; **verificação funcional** de cada storageState em contexto novo; destino sem loop (`/comun/admin/acervo` / `/comun/minha-participacao`); item fixture único compartilhado via `.local/comun-auth/current.json`; limpeza de runs anteriores antes de criar os atuais.
2. `operational-personas.mjs`: cleanup completo (`member_profiles` + `admin_profiles` + `admin_users` + Auth) cobrindo qualquer run pelo prefixo.
3. `check-comun-auth-readiness.mjs`: 8 validações (endpoint, criação, login, refresh, rota protegida via getUser, logout, remoção, ausência de resíduo) com marcador `COMUN_LOCAL_AUTH_READY`.
4. Validação intermediária: E2E autenticado **42/42** com o novo setup (4,8 min), cleanup verificado com zero resíduos.

## Declarações

- Piloto público: NÃO ABERTO
- Deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Dados reais: NÃO UTILIZADOS
- Custo externo: R$ 0
