# COMUN CI-R1 — Supabase local status transient retry

## Escopo

- Parent SHA: `36b88bc2f72a9c3aceedaa4c7485e069af1e69de`
- Branch: `codex/comun-ci-r1-supabase-local-status-retry`
- Produto, migrations, Vercel Production e Supabase Production: inalterados.

## Contrato

O helper `scripts/ci/read-supabase-local-env.mjs` é o único ajuste no bootstrap local dos contratos Territory local-only e P1T. Ele executa exclusivamente `supabase status -o env`, devolve o ambiente apenas para a substituição de comando que o consome e nunca o registra em diagnósticos.

- Allowlist transitória: `UPSTREAM_502`, `UPSTREAM_503`, `UPSTREAM_504`, cada uma exigindo código e mensagem upstream explicitamente reconhecíveis.
- Máximo: três tentativas totais, com backoff curto de 500 ms e 1000 ms.
- `unknownErrorsFailClosed=true`
- `semanticFailuresRetried=false`
- `secretsLogged=false`
- Falha transitória esgotada: `COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_EXHAUSTED`.
- Falha não transitória ou saída malformada: falha imediata, sem retry.

## Limites preservados

Não há retry em `supabase start`, `supabase db reset`, `psql`, migrations, assertions de contrato, testes, operações remotas ou deploys. O P1T continua aplicando a migration duas vezes e executando suas verificações de colunas, RLS, grants e script focal.

## Resultado esperado

- `productionWrites=0`
- `migrations=0`
- Checks e eventual merge SHA serão atualizados após a matriz remota.

Terminal pretendido: `COMUN_QUALITY_SUPABASE_LOCAL_STATUS_RETRY_GREEN_FAIL_CLOSED`.
