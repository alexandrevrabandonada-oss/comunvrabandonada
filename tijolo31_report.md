# Tijolo 31 - Fechar comun_pauta_synthesis_versions

Data: 2026-07-08

Ambiente usado: local-first, Supabase local via Docker.

Deploy: nao houve.

Checks contra producao: nao houve.

Banco remoto: nao tocado.

## Diagnostico

`comun_pauta_synthesis_versions` guarda historico editorial de pautas:

- `previous_public_synthesis`
- `new_public_synthesis`
- `previous_next_step`
- `new_next_step`
- `editor_note`
- `created_at`

A tabela e usada no admin de pauta por `listPautaSynthesisVersions()` e exibida em `/comun/admin/pautas/[id]`.

A rota publica de pauta usa `comun_pauta_spaces.public_synthesis` e `next_step`, nao le diretamente `comun_pauta_synthesis_versions`.

## Decisao

Classificacao final: `admin_only`.

Motivo: a tabela contem historico editorial e `editor_note`, que sao bastidores administrativos. Nao ha prova forte de que todo conteudo seja sanitizado para leitura publica direta.

## Implementacao

- Criada migration `supabase/migrations/20260708181116_harden_pauta_synthesis_versions_rls.sql`.
- RLS preservado/ligado.
- Grants de `anon` e `authenticated` revogados.
- `service_role` preservado para leitura e escrita server-side.
- `scripts/audit-comun-rls-matrix.mjs` atualizado para classificar a tabela como `admin_only`.
- `needs_review` removido das decisoes aceitas pelo auditor.
- `scripts/smoke-comun-rls-matrix.mjs` atualizado para testar bloqueio direto dessa tabela.
- `docs/comun-rls-matrix.md` regenerado.

## Resultado

Matriz final: `RLS_MATRIX_OK`.

Security smoke final: `RLS_MATRIX_SMOKE_OK`.

Nenhuma tabela permanece classificada como `needs_review`.
