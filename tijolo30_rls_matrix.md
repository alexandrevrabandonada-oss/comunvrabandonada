# Tijolo 30 - Resultado da matriz RLS

Fonte principal: `docs/comun-rls-matrix.md`.

Status final: `RLS_MATRIX_OK`.

## Classificacoes cobertas

- `public_read_safe`
- `public_insert_safe`
- `admin_only`
- `service_role_only`
- `needs_review`

## Gate automatico

Comando:

```bash
npm run audit:rls-matrix
```

O gate falha quando encontra:

- tabela publica sem classificacao;
- tabela sensivel com RLS desligado;
- `anon` com `SELECT` em tabela interna;
- `authenticated` com `SELECT` em tabela interna;
- policy publica permissiva em tabela interna;
- tabela marcada como `must_fix`.

## Security smoke

Comando:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run smoke:rls-matrix
```

Resultado final: `RLS_MATRIX_SMOKE_OK`.
