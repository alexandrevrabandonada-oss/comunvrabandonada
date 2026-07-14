# Tijolo 20-R1 - Fechamento local do banco e aceite do review ops

## Ambiente

- Ambiente usado: local para app e smokes HTTP.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only de app/smokes: sim.

## Docker / Supabase local

`npx supabase status` nao conseguiu acessar Docker Desktop:

```text
failed to inspect container health: open //./pipe/dockerDesktopLinuxEngine: O sistema nao pode encontrar o arquivo especificado.
```

Alternativa usada: `npx supabase db push --linked`, com dry-run previo confirmando apenas a migration `20260708024032_pauta_dossier_review_ops.sql`.

## Migration

Aplicada com sucesso:

```text
20260708024032_pauta_dossier_review_ops.sql
```

Confirmacao posterior pelo Data API/service role:

```text
SCHEMA_OK
```

## Resultado final

O Tijolo 20 ficou aceito: a fila de revisoes agora possui responsaveis, prioridade, prazo, filtro de vencidos e verificacao automatizada de nao vazamento publico dos campos operacionais.
