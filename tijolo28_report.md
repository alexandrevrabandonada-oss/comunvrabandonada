# Tijolo 28 - Destaques publicos e recomendacoes seguras de dossies

Data: 2026-07-08
Ambiente: local-first
Deploy: nao executado
Checks em producao: nao executados
Envio externo: nao executado

## Implementado

- Criada migration `supabase/migrations/20260708163526_public_dossier_features.sql`.
- Criada tabela `comun_public_dossier_features` apontando para snapshot publico, nao para rascunho interno.
- RLS habilitado na tabela nova, sem policy publica.
- Criados helpers publicos para:
  - listar destaques ativos;
  - ignorar destaque de snapshot inexistente, despublicado, `superseded` ou `unpublished`;
  - montar recomendacoes por recentes, atualizados, pauta, comunidade e categoria.
- `/comun/dossies` recebeu secoes:
  - Dossies em destaque;
  - Mais recentes;
  - Atualizados recentemente;
  - Por pauta;
  - Por comunidade;
  - Por categoria.
- `/comun` recebeu bloco publico de dossies em destaque.
- Paginas publicas de pauta exibem destaque ativo da propria pauta quando houver.
- Admin `/comun/admin/dossies/[id]` recebeu bloco `Destaque publico` por snapshot ativo.
- Permissao de curadoria manual limitada a `admin`, `editor` e `publisher`.
- Criado smoke `scripts/smoke-comun-public-dossier-features.mjs`.
- Adicionado comando `npm run smoke:public-dossier-features`.

## Pendencia de banco local

O Supabase local nao esta disponivel neste ambiente:

- `npx supabase status` falhou por Docker Desktop/Linux Engine indisponivel.
- `npx supabase db push --local --dry-run` falhou porque `127.0.0.1:54322` recusou conexao.

O dry-run remoto mostrou que a migration nova seria aplicada ao banco vinculado, mas `db push --linked` nao foi executado porque este tijolo proibe tocar producao/remoto por padrao.

## Status

Implementacao de codigo concluida. Aceite completo do smoke novo depende de aplicar `20260708163526_public_dossier_features.sql` em um banco local ou explicitamente autorizado.
