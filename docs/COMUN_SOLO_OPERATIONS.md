# Operação solo unificada do COMUN

## Releases canônicas posteriores à PR #23

Quando houver um único manifesto em `supabase/releases`, a promoção valida SHA,
CI, checksum, ausência de SQL destrutivo e fingerprint pré; executa somente a
migration declarada; exige postflight, fingerprint pós e zero achados antes de
preview, merge e produção. Não usa `supabase db push`, migration repair nem
reaplica o pacote histórico. A decisão manual continua sendo `comun:promover`.

O fingerprint bloqueante contém somente objetos controláveis pelo COMUN.
Defaults de `supabase_admin` permanecem em snapshot informativo com hash
monitorado. Toda migration posterior à PR #23 deve revogar grants implícitos,
habilitar RLS quando aplicável e declarar allowlists; o FAST e o FULL executam
`npm run db:privileges:lint`.

Cada release aplicada é registrada em `public.comun_schema_releases` dentro da
mesma transação. O ledger é privado, não substitui nem altera
`supabase_migrations.schema_migrations` e recusa checksum ou fingerprints
divergentes.

### Transporte PostgreSQL do runner

O runner separa três contratos: `executeSql` aplica exclusivamente a transação
sem interpretar `stdout`; `queryJson` usa `psql --tuples-only --no-align
--quiet` e exige exatamente um documento JSON; `queryScalar` usa o mesmo
formato canônico e exige exatamente uma linha não vazia. Todos os comandos usam
`--no-psqlrc`, `ON_ERROR_STOP=1`, buffer catalogal de 64 MiB e erros
sanitizados. Cabeçalhos, separadores, contadores `(1 row)`, múltiplas linhas e
saída vazia são recusados.

O preflight remoto estritamente read-only pode ser disparado manualmente no
`COMUN Nightly` com `release_preflight=true`. Nesse modo, somente manifesto,
checksum, lint destrutivo, fingerprint, contagens agregadas, ledger e objetos
de preflight são lidos. FULL, cleanup, worker, transação, migration, merge e
domínio não são executados.

## Estado vigente

O COMUN é operado por uma pessoa. A decisão manual de release é representada uma única vez pela label `comun:promover` ou pelo disparo manual equivalente. Revisores externos, duas aprovações, GitHub Environments, cofre próprio e restore integral não são requisitos deste projeto.

Estados operacionais permitidos:

- `SOLO_LOCAL_GREEN`
- `SOLO_READY_TO_PROMOTE`
- `SOLO_PROMOTION_RUNNING`
- `SOLO_PRODUCTION_GREEN`
- `SOLO_PROMOTION_FAILED`

`NO_GO_REMOTE_INTEGRATION` só deve ser emitido diante de uma falha técnica concreta, e não como bloqueio permanente de governança.

## Fonte canônica

Desde o fechamento verde da PR #23 em 23 de julho de 2026, `main` é a fonte
canônica. Deve existir apenas uma branch de trabalho e uma PR ativa por vez:

```text
main -> codex/tijolo-<numero>-<nome> -> PR -> CI -> promoção/merge -> main
```

Não empilhar PRs, não iniciar tijolo estrutural com CI vermelho e sempre criar migrations novas para mudanças de banco.

## Automação ativa

- `comun-ci.yml`: FAST em toda PR e push; FULL na PR #23, branches de promoção e chamadas explícitas.
- `comun-promote.yml`: única promoção, autorizada por operador `admin` ou `maintain` e SHA imutável.
- `comun-nightly.yml`: regressão FULL diária e scheduler já existente do acervo.
- `comun-nightly.yml`, no modo manual `release_preflight=true`: somente
  preflight remoto read-only da release.

O push sozinho nunca promove produção. A label `comun:promover` é a autorização humana única. Labels desconhecidas são ignoradas.

## Gates

FAST executa instalação reproduzível, testes do contrato solo, typecheck, lint, unitários, build, Supabase local, DB lint, RLS e limpeza de fixtures.

FULL executa dois ensaios independentes da reconciliação, compara fingerprints, comprova postflight e idempotência e percorre as jornadas críticas de mapa, captura, comunidades, pautas, acervo, arte, rádio, operação, shell mobile, PWA, no-leak, cleanup e production-like.

O gate verde é `COMUN_CI_GREEN`.

## Promoção

A promoção confirma permissão do operador, PR, branch, SHA, CI e mesclabilidade. Antes da primeira escrita remota, cria o artifact `comun-pre-promotion-checkpoint-<SHA>` por sete dias, contendo somente schema, listas de migrations, fingerprint, contagens agregadas e identificação sanitizada do deployment. Ele não é backup integral e não contém dados pessoais, fotos, coordenadas privadas, object keys ou credenciais.

O SQL é validado e aplicado em uma única transação `BEGIN`/`COMMIT` com falha imediata. São proibidos `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, `DELETE` sem `WHERE`, `ALTER TABLE DROP COLUMN`, recriação de tabela com dados, `migration repair` e comandos administrativos fora da allowlist. Qualquer erro antes do commit produz rollback do PostgreSQL e interrompe a promoção.

Depois do banco, o workflow executa postflight, DB lint, RLS, cleanup dry-run, preview e no-leak. Somente então remove o draft, cria merge commit, aguarda o deployment de `main` e monitora produção por 15 minutos. Domínio só pode ser alterado nesse fluxo quando configurado e necessário.

## Rollback

- antes do commit do banco: rollback transacional, sem merge ou domínio;
- depois da migration e antes do merge: não mesclar; corrigir por migration nova;
- depois do merge: solicitar rollback para o deployment Vercel anterior, restaurar aliases quando aplicável e abrir issue de incidente;
- nunca executar SQL reverso destrutivo automaticamente.

O rollback de aplicação/deployment só pode ser solicitado quando o próprio
workflow tiver confirmado que realizou o merge. Falhas de validação, captura,
transporte PostgreSQL ou migration anteriores ao merge não podem publicar uma
mensagem enganosa de rollback de deployment.

Marcadores de transporte esperados incluem
`SOLO_PSQL_PROCESS_FAILED`, `SOLO_PSQL_OUTPUT_BUFFER_EXCEEDED`,
`SOLO_CANONICAL_BASELINE_OUTPUT_EMPTY`,
`SOLO_CANONICAL_BASELINE_OUTPUT_INVALID`,
`SOLO_CANONICAL_SCALAR_OUTPUT_INVALID`,
`SOLO_CANONICAL_PREFLIGHT_OBJECTS_INVALID`,
`SOLO_CANONICAL_DATABASE_QUERY_FAILED` e
`SOLO_CANONICAL_DATABASE_TRANSACTION_FAILED`. Mensagens nunca incluem URL,
senha, token, string de conexão ou saída catalogal bruta.

## Contrato de secrets

Somente nomes, nunca valores:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_TEAM_ID`
- `VERCEL_CANONICAL_PROJECT_ID`
- `VERCEL_LEGACY_PROJECT_ID`

Os antigos secrets `PR23_BACKUP_*` não fazem parte do contrato vigente.

## Ciclo depois da PR #23

`main` é a fonte única. Cada novo tijolo nasce de `main`, usa uma branch
`codex/tijolo-<numero>-<nome>`, uma PR e volta a `main` somente depois do CI.
Branches históricas só podem ser removidas quando não têm PR aberta, commits
únicos, tag exclusiva ou worktree ativo.

## Fechamento da PR #23

- HEAD promovido: `78ace0a3ec6c4f150abb2039f81a4b6732853045`;
- merge commit: `37371098e8f78b1effc047e18b6f8504b3a58f31`;
- Supabase reconciliado por transação forward-only;
- domínio canônico: `comunsocial.online`;
- projeto Vercel canônico: `comunvrabandonada`;
- smoke público: 19/19 ciclos verdes por mais de 15 minutos;
- gate humano: 0/3;
- piloto público: fechado.

O estado atual fica em
[`reports/current/estado-atual-comun.md`](../reports/current/estado-atual-comun.md).
Documentos de preparação da PR #23 são históricos.

## Preview Vercel protegido

A validação imutável usa `vercel@50.28.0`. Nessa versão, a sintaxe comprovada é
`vercel curl <rota> --deployment <URL HTTPS completa> --token <redacted> --
<argumentos curl>`; não existe opção `--url`.

O cliente não depende de projeto implícito nem de slug de `--scope`. Antes das
rotas, ele inspeciona o deployment e exige:

- hostname `*.vercel.app` e protocolo HTTPS;
- project ID canônico;
- team ID canônico;
- SHA exato da PR;
- estado `READY`;
- target `preview`.

Depois valida `/comun`, a matriz pública canônica e o Range PMTiles. O
diagnóstico persistido contém somente SHA, deployment ID, hostname, versão do
CLI, status sanitizados, tempos e resultado. Tokens, cookies, Authorization,
corpos e headers privados são proibidos.

Para repetir somente esse gate, use `preview_preflight=true` no `COMUN
Nightly`. Esse modo não recebe secrets de Supabase e mantém release preflight,
FULL, cleanup, worker, produção e baseline como `skipped`.

Se o CLI emitir `The token provided via --token argument is not valid`, a
classe é `VERCEL_CLI_AUTH_FAILED`. Não alterar URL, scope, projeto ou proteção
para contornar essa falha: substitua `VERCEL_TOKEN` por uma credencial válida
do time indicado por `VERCEL_TEAM_ID` e repita somente o preflight.
