# Tijolo 31 - Auditoria de seguranca

Ambiente: local-first, Supabase local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

## Tabela fechada

`public.comun_pauta_synthesis_versions`

## Risco identificado

A tabela contem historico editorial e nota interna de edicao (`editor_note`). Mesmo quando parte do texto e publico em `comun_pauta_spaces`, o historico de alteracoes nao deve ser lido diretamente por visitantes.

## Controle aplicado

- RLS ligado.
- `anon` sem acesso direto.
- `authenticated` sem acesso direto.
- `service_role` mantido para operacoes server-side.
- Sem policy publica.

## Confirmacao publica

As paginas publicas de pauta continuam funcionando via campos publicos de `comun_pauta_spaces`.

O historico editorial e exibido apenas no admin.
