# COMUN — 48.1A · preflight remoto

Estado: **BLOQUEADO_POR_PERMISSAO**. A ferramenta Supabase retornou erro de
permissão ao consultar o projeto `nvmdszymrtacfehdynpg`; a listagem da conta
mostrou somente projetos não relacionados. Não há credencial remota no
worktree. Este relatório não contém segredo, PII ou fingerprint inventado.

## Leitura read-only pelo painel autenticado

Em 2026-08-05, o responsável do projeto abriu o painel do projeto correto em
uma sessão Chrome autenticada. Foram visitadas somente telas de catálogo, sem
SQL Editor, sem inspeção de linhas, sem criação/alteração e sem leitura de
segredos.

Observações sanitizadas:

- o identificador do projeto exibido pelo painel coincide com o alvo do
  preflight;
- o catálogo público de tabelas carregou e permitiu busca por nome; as buscas
  `wallet`, `particip` e `relata` não retornaram tabela correspondente;
- a tela **Database Migrations** não exibiu entradas de migration;
- a tela de Storage exibiu buckets existentes, incluindo
  `comun-report-attachments` e `comun-public-safe-attachments`, ambos sem a
  marcação de público; não existe bucket dedicado
  `comun-relata-private` visível;
- a tela de provedores de autenticação abriu, mas não foi usada para alterar
  configuração nem para extrair credenciais.

Essas observações são evidência de interface, não substituem uma leitura
autorizada de ledger, schema privado, RLS, grants, funções, hashes de
configuração ou allowlist. A ausência de uma tabela no filtro público também
não prova ausência no schema privado.

Antes de qualquer promoção devem ser capturados somente valores sanitizados:
SHA de `main`, deployment `READY`, projeto Supabase, ledger de migrations,
schema e objetos necessários, RLS/grants, buckets privados, Auth sem PII,
flags, hashes de configuração e ausência de drift.

Se qualquer migration desconhecida, drift não forward-only, segredo exposto,
RLS não comprovada ou divergência de fingerprint aparecer, emitir blocker e
não escrever. O preflight não cria usuário, não ativa flag e não envia dados.

Resultado: `COMUN_48_1A_REMOTE_PREFLIGHT_BLOCKED_PROJECT_PERMISSION`.
Promoção de migration, criação de allowlist e piloto do proprietário foram
adiados; `launch_publicly=false`.

## Resultado após merge da infraestrutura dormente

PR #171 foi mesclada com proteção pelo head SHA
`aaebe841f56aa9189c1afdb745db1a720df96fed`; merge SHA:
`1d8774491c87cc9d9dbc907da5b6b9cc9e8b5cfd`. A branch remota foi removida.

O smoke pós-deployment confirmou `/comun`, `/comun/relatar` e
`/comun/calcadas` em 200; Relata, Ônibus, encaminhamento, STMU e APIs
experimentais permaneceram dormentes. Depois da propagação do deployment,
`/api/comun/relata` retornou 404 para GET, POST, PUT, PATCH, DELETE, HEAD e
OPTIONS, sem 405.

O resultado terminal técnico desta etapa é
`COMUN_48_1A_MERGED_DORMANT_PREFLIGHT_INFRA_GREEN_REMOTE_PREFLIGHT_BLOCKED_PROJECT_PERMISSION`.

## Diagnóstico CLI versus MCP

O ambiente não possui `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`,
`SUPABASE_PROJECT_REF`, `SUPABASE_DB_URL` ou `SUPABASE_SERVICE_ROLE_KEY` como
variáveis de processo. A CLI `supabase` é a versão 2.111.0 e está autenticada
por perfil local não exposto; `supabase projects list` listou o projeto-alvo e
seu estado saudável, mas o repositório não está vinculado localmente.

O conector MCP, na mesma execução, listou apenas projetos não relacionados e
`supabase_get_project` para o alvo retornou erro de permissão. Portanto a
classificação é: Management API da CLI autenticada e com escopo de projeto;
MCP sem autorização para o projeto; leitura de banco, ledger, RLS e grants não
comprovada. Não foi usada senha de banco, service role, SQL Editor ou endpoint
de escrita.
