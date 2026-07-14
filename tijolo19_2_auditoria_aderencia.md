# Tijolo 19.2 - auditoria de aderencia da fila de revisoes

Data: 2026-07-08

## Objetivo

Verificar se a fila administrativa de revisoes de dossies existe no codigo e corresponde ao que a documentacao descreve.

## Referencias lidas

- `reports/estado-comun-sprint-19-1-dupla-revisao-dossies.md`;
- `docs/operacao-comun.md`;
- `docs/dossies-por-pauta.md`;
- `docs/deploy-checklist.md`.

## Codigo verificado

Rota:

- `app/comun/admin/dossies/revisoes/page.tsx`: existe.

Helper:

- `lib/pauta-dossiers.ts`: contem `listAdminPautaDossierReviewQueue`.

Smoke:

- `scripts/smoke-comun-pauta-dossier-review-queue.mjs`: existe.

Package:

- `package.json`: contem `smoke:pauta-dossier-review-queue`.

## Filtros verificados

Todos existem na UI e no helper:

- pendente factual: `pending_factual`;
- pendente editorial: `pending_editorial`;
- factual aprovado, faltando editorial: `factual_without_editorial`;
- editorial aprovado, faltando factual: `editorial_without_factual`;
- bloqueado por mesmo revisor: `blocked_same_reviewer`;
- ajustes solicitados: `changes_requested`;
- rejeitados: `rejected`;
- prontos para publicar: `ready_to_publish`.

## UI verificada

A fila mostra:

- indicadores de pendencia factual, pendencia editorial, bloqueados e prontos;
- filtro por estado da fila;
- titulo/slug do dossie;
- pauta associada;
- status editorial;
- idade do dossie;
- ultima revisao;
- etapa pendente;
- revisores factual/editorial;
- link para abrir dossie.

## Smoke verificado

O smoke cria dossies em categorias diferentes e valida:

- pendente total;
- factual sem editorial;
- editorial sem factual;
- bloqueado por mesmo revisor;
- ajustes solicitados;
- rejeitado;
- pronto para publicar;
- mudanca de categoria apos nova revisao;
- rota admin sem sessao nao expoe segredo.

## Resultado da auditoria

Aderencia: aprovada.

Nao foi necessario alterar codigo ou documentacao. A documentacao nao promete funcionalidade ausente para a fila de revisoes.
