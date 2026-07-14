# Tijolo 27 - Navegacao publica entre pautas, comunidades e dossies relacionados

Data: 2026-07-08
Ambiente: local-first
Deploy: nao executado
Checks em producao: nao executados
URL usada nos smokes: http://localhost:3000

## Implementado

- Pagina publica `/comun/dossies/[slug]` recebeu breadcrumb publico: COMUN, Dossies, pauta relacionada e dossie atual.
- Pagina publica do dossie passou a exibir blocos de pauta relacionada, comunidade relacionada e dossies relacionados.
- Pagina publica de pauta passou a exibir `Dossies publicados desta pauta`.
- Pagina publica de comunidade passou a exibir `Dossies desta comunidade`.
- Indice publico `/comun/dossies` passou a ter links clicaveis de filtro por pauta, comunidade e categoria, preservando busca e ordenacao.
- Admin do dossie recebeu links para a listagem publica de dossies e para dossies publicos relacionados.
- Helper de dossies publicados agora centraliza consultas apenas sobre snapshots ativos e campos publicos.
- Criado smoke local `scripts/smoke-comun-public-dossier-navigation.mjs`.
- Adicionado comando `npm run smoke:public-dossier-navigation`.

## Fonte publica permitida

A navegacao publica usa somente snapshots ativos de publicacao e metadados publicos:

- titulo publico;
- resumo publico;
- slug publico;
- pauta publica;
- comunidade publica;
- categoria publica;
- datas publicas;
- `public_version_label`;
- `public_change_note`.

## Status

Aceito localmente. Nao houve deploy e nenhuma verificacao foi feita contra producao.

## Proximo tijolo recomendado

Criar uma camada de recomendacao editorial publica para destacar dossies por recorrencia de pauta/comunidade, mantendo a mesma regra de snapshots ativos como unica fonte publica.
