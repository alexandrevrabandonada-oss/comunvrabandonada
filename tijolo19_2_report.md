# Tijolo 19.2 - fila administrativa de revisoes de dossies

Data: 2026-07-07

## Objetivo

Criar uma fila administrativa para dossies pendentes de revisao, permitindo identificar rapidamente o que precisa de revisao factual, revisao editorial, desbloqueio por mesmo revisor, ajustes, rejeicao ou publicacao.

## Implementado

Rota criada:

- `/comun/admin/dossies/revisoes`

Menu admin atualizado:

- link `Revisoes`.

Helper criado em `lib/pauta-dossiers.ts`:

- `listAdminPautaDossierReviewQueue`

Classificacoes da fila:

- `pending_factual`;
- `pending_editorial`;
- `factual_without_editorial`;
- `editorial_without_factual`;
- `blocked_same_reviewer`;
- `changes_requested`;
- `rejected`;
- `ready_to_publish`.

## Indicadores

Topo da fila mostra:

- pendente factual;
- pendente editorial;
- bloqueados;
- prontos para publicar.

## Lista operacional

Cada item mostra:

- titulo interno;
- slug publico ou slug interno;
- pauta associada;
- status editorial;
- idade do dossie;
- ultima revisao;
- etapa pendente;
- revisores factual/editorial;
- link para abrir o dossie.

## Seguranca

Confirmado:

- rota exige `requireComunAdmin`;
- fila e server-side;
- sem mudanca na rota publica de dossies;
- notas internas e checklist de revisao nao sao expostos publicamente;
- smoke confirma que rota admin sem sessao nao expoe segredo.

## Documentacao

Atualizados:

- `docs/dossies-por-pauta.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`.

## Deploy

Status: passou.

Producao:

- `https://comunvrabandonada.vercel.app`

Deploy Vercel:

- `https://comunvrabandonada-58po9t1sq-alexandrevrabandonada-oss-projects.vercel.app`

## Proximo tijolo recomendado

Adicionar responsavel/atribuição editorial por etapa, com filtros por pessoa e SLA de revisao.
