# COMUN CI-R1 — Supabase local status transient retry

## Escopo

- Parent SHA: `36b88bc2f72a9c3aceedaa4c7485e069af1e69de`
- Branch: `codex/comun-ci-r1-supabase-local-status-retry`
- Produto, migrations, Vercel Production e Supabase Production: inalterados.

## Contrato

O helper `scripts/ci/read-supabase-local-env.mjs` cobre o bootstrap local dos contratos Territory local-only e P1T e, em GitHub Actions, a leitura interna do wrapper `scripts/comun-local-env.mjs` usado pela PR lane. Ele executa exclusivamente `supabase status -o env`, devolve o ambiente apenas para o processo que o consome e nunca o registra em diagnósticos. Desenvolvimento Windows/local continua usando o caminho `npx` existente.

- Allowlist transitória: `UPSTREAM_502`, `UPSTREAM_503`, `UPSTREAM_504`, cada uma exigindo código e mensagem upstream explicitamente reconhecíveis.
- Máximo: três tentativas totais, com backoff curto de 500 ms e 1000 ms.
- `unknownErrorsFailClosed=true`
- `semanticFailuresRetried=false`
- `secretsLogged=false`
- Falha transitória esgotada: `COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_EXHAUSTED`.
- Falha não transitória ou saída malformada: falha imediata, sem retry.

## Limites preservados

Não há retry em `supabase start`, `supabase db reset`, `psql`, migrations, assertions de contrato, testes, operações remotas ou deploys. O P1T continua aplicando a migration duas vezes e executando suas verificações de colunas, RLS, grants e script focal.

O Quality run `32604733693` confirmou o mesmo `UPSTREAM_502` depois do reset/seed, no wrapper local da PR lane; este fechamento inclui esse último caminho CI, sem ampliar a allowlist nem repetir reset/migration.

## Reparos independentes revelados pela matriz real

A validação remota encontrou dois gates preexistentes fora da semântica do helper. Ambos foram corrigidos de forma fail-closed, sem migration, write de negócio ou mutação de ambiente:

- `/comun/cooperativas` passou a declarar um `<title>` canônico não vazio (`Feirinha | COMUN VR Abandonada`), preservando o teste Axe existente como regressão autoritativa;
- o preflight histórico `48.4-A7` preserva a ancestralidade do baseline A6, mas `migrationCount=0` passou a medir somente o delta da PR contra `github.event.pull_request.base.sha`, em vez de rejeitar migrations legítimas já integradas ao `main` depois do fechamento A6.

O preflight A7 corrigido ficou verde no run `32604581893`, incluindo metadata read-only e dry-run remoto sem migration planejada.

## Resultado esperado

- `productionWrites=0`
- `migrations=0`
- `productionEnvMutations=0`
- P1T e Territory local-only: verdes em CI real.
- A7 preflight corrigido: verde.
- O commit deste fechamento solicita Preview exact-head pelo mecanismo canônico `[comun-preview]`; merge e terminal final permanecem condicionados aos gates do head exato.

Terminal pretendido: `COMUN_QUALITY_SUPABASE_LOCAL_STATUS_RETRY_GREEN_FAIL_CLOSED`.
