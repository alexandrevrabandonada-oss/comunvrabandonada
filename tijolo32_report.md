# Tijolo 32 - Release candidate local do COMUN

Data: 2026-07-08

Ambiente usado: local-first, Supabase local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

Banco remoto: nao tocado.

## Reset local

- Supabase local iniciado via Docker.
- Banco local resetado com `npx supabase db reset --local`.
- Todas as migrations foram aplicadas do zero em ordem.
- Buckets locais criados/confirmados por `npm run storage:setup`.
- Next local usado em `http://localhost:3000`.

## Correcoes reveladas pela RC

A RC em banco limpo encontrou lacunas que banco local antigo escondia:

- faltava `INSERT` publico em `comun_reports` e `comun_actions`;
- faltava `SELECT` publico em tabelas publicas legadas seguras;
- faltavam grants `service_role` em tabelas COMUN publicas usadas por smokes/server-side;
- faltava `SELECT` na view sanitizada `comun_public_reports`;
- smokes antigos de dossie ainda esperavam publicacao direta sem snapshot.

Foram adicionadas migrations e ajustes de smoke para refletir o modelo atual.

## Resultado

Decisao: `RC_LOCAL_PASS`.

`npm run verify:rc-local` executou com sucesso em ambiente local.

## Risco restante

O smoke `smoke:admin-auth` informa manualmente que nao ha admin ativo no Supabase local resetado. Isso e esperado no ambiente local limpo; a rota admin segue exigindo autenticacao.
