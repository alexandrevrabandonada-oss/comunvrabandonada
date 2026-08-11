# COMUN — 48.2-C1-R1 — Reconciliação do drift do catálogo PMVR

Data de fechamento: 11/08/2026. Baseline: `origin/main=359e2f288235a1cbcf4d6d27333322b33bbdcdd7`.

## Resultado

`COMUN_48_2_C1_R1_TRANSPORT_SOURCE_DRIFT_RECONCILED_GREEN`

O hash bruto do catálogo oficial PMVR/STMU mudou, mas a comparação semântica
normalizada encontrou a mesma rede de 48 linhas: não houve linha adicionada ou
removida, nem mudança de operadora, label, horário ou itinerário no conjunto
revisado. A variação foi classificada como alteração de renderização/conteúdo
sem mudança semântica.

O snapshot anterior não conservava URLs por linha; por isso não foi afirmada
uma comparação histórica de URLs que ele não permitia. A nova versão passa a
registrá-las para permitir esse diff completo no próximo ciclo.

## Proveniência versionada

- snapshot anterior: `comun-transport-programmed-network-v1-20260811`;
- snapshot ativo: `comun-transport-programmed-network-v2-20260811`;
- `previousSnapshotId` preserva a relação entre as versões;
- v1 não foi sobrescrito;
- o catálogo v2 tem captura bruta e hash semântico normalizado, com 48 linhas;
- os cinco documentos PDF já manifestados permaneceram com os hashes
  verificados;
- o runtime importa somente o snapshot ativo do repositório: não faz scraping,
  acesso à PMVR nem atualização automática.

O verificador final emitiu
`COMUN_48_2_C1_CATALOG_RENDERING_DRIFT_SEMANTICS_CURRENT` e
`COMUN_48_2_C1_OFFICIAL_SOURCES_CURRENT`.

## Entrega e promoção

- PR funcional [#277](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/277), head exato `8168b8fce35727e409f5b756143b4bf9560a5136`, mesclada como `1ef309a3fe89cd2fc7381ee66d8ca026cacc096c`;
- `git diff origin/main...HEAD -- supabase/migrations` permaneceu vazio;
- testes locais de normalização, diff, auditoria de snapshot, verificação de
  fontes, typecheck, lint, unit e build passaram;
- duas lanes de CI falharam inicialmente ao iniciar Supabase descartável por
  erro transitório `502`; a reexecução completa passou sem modificação de
  produto ou schema;
- a ativação/deploy exact-main `31525123463` concluiu verde mantendo
  `COMUN_OBSERVATORY_TRANSPORT_PROGRAMMED_ENABLED=enabled`.

## Prova Production read-only

Responderam `200`: hub de Observatórios, página de Transporte, página de
Fontes, registry, API de Transporte e API da linha 210. A API confirmou o
snapshot ativo v2 e 48 linhas; a linha 210 preserva a partida do dia seguinte.
`POST /api/comun/observatorios/transporte` respondeu `405`.

Não houve relato, Carteira, publicação, snapshot, package, attempt, coletivo,
hard delete, envio externo ou request runtime à PMVR. A resposta pública não
continha marcadores de Relata privado, Carteira, forwarding ou localização
exata.

## Limites preservados

- fontes oficiais programadas, não dados em tempo real;
- não foi criada série histórica nem ranking territorial;
- P5/STMU, Relata, Carteira, anexos, localização e encaminhamentos continuam
  fora da UI, API e cache públicos;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece;
- auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e
  `launch_publicly=false`.

Fonte revisada: [catálogo oficial PMVR/STMU](https://www.voltaredonda.rj.gov.br/horario-de-onibus/).
