# Tijolo 26 - Indice publico de dossies publicados

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.  
Envio externo: nao executado.

## Implementado

- Rota publica `/comun/dossies` reforcada para listar somente snapshots publicos ativos.
- Removido fallback de mini-dossies legados na listagem publica.
- Cards publicos com:
  - titulo;
  - resumo;
  - pauta;
  - comunidade;
  - categoria;
  - data de publicacao;
  - data de atualizacao publica;
  - rotulo publico de versao;
  - link para `/comun/dossies/[slug]`.
- Filtros publicos por pauta, comunidade e categoria.
- Busca publica por titulo, resumo, corpo publico e pauta.
- Ordenacao por mais recentes ou atualizados recentemente.
- Estados seguros de lista vazia e filtro sem resultado.
- Metadata da pagina com title, description, canonical, OpenGraph e Twitter card.
- Link discreto no admin shell para abrir `/comun/dossies`.

## Implementacao

- `app/comun/dossies/page.tsx`
- `components/admin-shell.tsx`
- `lib/pauta-dossiers.ts`
- `scripts/smoke-comun-public-dossier-index.mjs`
- `package.json`

## Proximo tijolo recomendado

Tijolo 27: melhorar navegacao publica entre pauta e dossies relacionados, mantendo as mesmas garantias de snapshot publico.
