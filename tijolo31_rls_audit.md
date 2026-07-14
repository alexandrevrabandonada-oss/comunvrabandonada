# Tijolo 31 - Auditoria RLS

Status final: `RLS_MATRIX_OK`.

## Decisao alterada

Antes:

- `comun_pauta_synthesis_versions`: `needs_review`

Depois:

- `comun_pauta_synthesis_versions`: `admin_only`

## Grants finais

- `anon`: sem `SELECT`.
- `authenticated`: sem `SELECT`.
- `service_role`: com `SELECT`.

## Gate atualizado

O auditor nao aceita mais `needs_review` como decisao valida.

O smoke `smoke:rls-matrix` inclui `comun_pauta_synthesis_versions` na lista de tabelas protegidas contra acesso direto de `anon` e `authenticated`.
