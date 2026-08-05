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
