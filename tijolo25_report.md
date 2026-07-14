# Tijolo 25 - Pagina publica segura dos dossies

Data: 2026-07-08

Ambiente: local-first com banco Supabase linkado/autorizado.  
Deploy: nao executado.  
Checks em producao: nao executados.  
Envio externo: nao executado.

## Implementado

- Migration `20260708150335_public_dossier_page_metadata.sql`.
- Campos publicos limitados no snapshot:
  - `public_change_note`;
  - `public_version_label`;
  - `public_updated_at`.
- Pagina publica `/comun/dossies/[slug]` com:
  - titulo;
  - resumo;
  - corpo publico;
  - data de publicacao;
  - data da ultima atualizacao publica;
  - bloco `O que este dossie mostra`;
  - bloco `Demandas publicas`;
  - bloco `Proximos passos`;
  - link seguro para pauta relacionada.
- Changelog publico limitado com `Publicado em`, `Atualizado em`, rotulo de versao e nota publica segura.
- Metadados seguros para compartilhamento:
  - title;
  - description;
  - canonical;
  - OpenGraph;
  - Twitter card.
- Estado rollback exibido como versao revisada, sem usar a palavra rollback publicamente.
- Estado despublicado continua sem revelar existencia interna, motivo ou historico.
- Admin permite editar resumo publico seguro da alteracao no historico de publicacao.

## Arquivos principais

- `app/comun/dossies/[slug]/page.tsx`
- `app/comun/admin/dossies/[id]/page.tsx`
- `app/actions.ts`
- `lib/pauta-dossiers.ts`
- `lib/types.ts`
- `scripts/smoke-comun-public-dossier-page.mjs`
- `supabase/migrations/20260708150335_public_dossier_page_metadata.sql`

## Proximo tijolo recomendado

Tijolo 26: criar index/listagem publica aprimorada de dossies publicados, com filtros por pauta/comunidade e sem expor historico interno.
