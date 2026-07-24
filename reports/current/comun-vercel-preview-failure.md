# Validação autenticada do preview Vercel da PR #30

Atualizado em 24 de julho de 2026.

## Falha original

- run de promoção: `30104161976`;
- job: `89517406301`;
- etapa: `Validate immutable Vercel preview`;
- marcador: `SOLO_VERCEL_PREVIEW_CURL_FAILED:/comun:1`;
- Vercel CLI: `50.28.0`;
- deployment GitHub: `5590596923`;
- deployment Vercel: `dpl_BJVrnji9TCta1ZtWP32yW736KeW8`;
- projeto: `comunvrabandonada`;
- rota: `/comun`;
- resultado: interrompido antes de merge, deployment de `main` ou domínio.

## CONFIRMED_ROOT_CAUSE

A implementação antiga passava o hostname sem protocolo e executava `vercel
curl` com uma rota relativa e um `--scope` presumido. O log original não
preservava stderr suficiente para distinguir essas hipóteses.

O cliente isolado comprovou a sintaxe real do CLI fixado:

```text
vercel curl <rota> --deployment <URL HTTPS completa> --token <redacted> -- <args curl>
```

O CLI `50.28.0` não oferece `--url`; a URL HTTPS completa pertence ao argumento
`--deployment`.

O primeiro preflight instrumentado, run `30107946508`, preservou o diagnóstico
sanitizado no artifact `8602400606` e confirmou a causa inferior:
`VERCEL_SCOPE_FAILED`. O runner usava o slug
`alexandrevrabandonada-oss-projects`, mas o token do Actions não possuía acesso
a esse escopo.

Uma tentativa de descobrir outro slug pelo endpoint de time também foi
rejeitada com HTTP 403 no run `30109583029`; artifact `8602956825`. Slug não é
um contrato necessário para acesso pela URL imutável. O cliente passou a omitir
`--scope` e comprovar o vínculo canônico pelos IDs de projeto e time retornados
pelo próprio deployment, além de SHA, estado `READY` e target `preview`.

## Patch

- cliente isolado em `scripts/solo/vercel-preview-client.mjs`;
- URL completa validada como `https://*.vercel.app`;
- CLI fixado uma vez em `50.28.0`;
- inspeção do deployment antes de qualquer rota;
- projeto, time, SHA, `READY` e `preview` exigidos;
- diagnóstico sanitizado preservado por sete dias;
- probe `/comun` antes da matriz;
- nove rotas e Range PMTiles validados;
- nenhum corpo, token, cookie ou header privado no artifact;
- modo `preview_preflight=true` sem acesso ao banco.

## Validação final

- HEAD técnico: `7a86cc8585ae81a8b732346220b30dbaa29f8578`;
- FAST: run `30109806856`, sucesso;
- FULL: run `30109806856`, sucesso na tentativa controlada 2; a tentativa 1
  sofreu o 502 transitório conhecido no restart do Supabase local;
- Vercel: sucesso;
- deployment GitHub: `5592097950`;
- deployment Vercel: `dpl_41VBYab1Z6i6cBtr5Y266tJAZPyy`;
- host:
  `comunvrabandonada-9g7zd0kqb-alexandrevrabandonada-oss-projects.vercel.app`;
- projeto: `prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X`;
- time: `team_LBVwyK8FQMO7tA3hzVXXeumF`;
- estado do deployment: `READY`;
- preflight isolado: run `30111887097`;
- artifact sanitizado: `8603864773`;
- jobs não relacionados: `skipped`;
- resultado: `VERCEL_CLI_AUTH_FAILED`.

O log sanitizado do run final registra:

```text
Error: The token provided via --token argument is not valid.
```

O conector Vercel autenticado confirmou read-only o mesmo time, projeto e
deployment `READY`. Assim, deployment, URL, SHA e aplicação estão disponíveis;
o bloqueio restante é exclusivamente o valor do secret `VERCEL_TOKEN` no
GitHub Actions, atualizado pela última vez em 23 de julho de 2026. O valor não
foi lido nem alterado.

A probe `/comun`, a matriz e o Range PMTiles não foram executados porque a
inspeção autenticada falhou antes das rotas, como exige o contrato.

Decisão: `NO_GO_VERCEL_PREVIEW_CREDENTIAL`. Uma nova credencial Vercel válida
para o time canônico é necessária antes de repetir o preflight. Portanto,
`COMUN_VERCEL_PREVIEW_READY_TO_RETRY_PROMOTION` não pode ser emitido neste lote.

## Declarações

- migration: não executada;
- Supabase remoto: não acessado por este lote;
- ledger, grants, RLS, functions e policies: inalterados;
- merge: não executado;
- domínio: inalterado;
- deployment manual: não criado;
- label `comun:promover`: ausente.
