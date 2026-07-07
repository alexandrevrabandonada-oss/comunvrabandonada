# Estado COMUN Sprint 19.1 - dupla revisao de dossies

Data: 2026-07-07

## Objetivo

Criar aprovacao editorial com dois revisores distintos e trilha estruturada de revisao por dossie antes da publicacao publica.

## Modelagem

Migration criada e aplicada:

- `supabase/migrations/20260707232209_pauta_dossier_double_review.sql`

Tabela criada:

- `comun_pauta_dossier_reviews`

Campos:

- `id`;
- `dossier_id`;
- `review_stage`;
- `reviewer_name`;
- `reviewer_role`;
- `decision`;
- `checklist`;
- `notes`;
- `created_at`.

Etapas:

- `factual_review`;
- `editorial_review`.

Decisoes:

- `approved`;
- `changes_requested`;
- `rejected`.

RLS fica habilitado. `anon` e `authenticated` nao recebem acesso direto. Revisoes sao internas e acessadas via servidor/admin.

## Revisao factual

Checklist criado:

- evidencias publicas revisadas;
- sem dado pessoal;
- sem contato privado;
- sem resposta oficial completa;
- sem acusacao sem base;
- distincao entre fato, relato e demanda;
- links/nomes publicos conferidos, quando houver.

Admin registra:

- nome do revisor;
- papel/funcao;
- decisao;
- checklist;
- notas internas.

## Revisao editorial

Checklist criado:

- texto claro;
- linguagem objetiva;
- titulo adequado;
- resumo fiel;
- demandas compreensiveis;
- proximo passo claro;
- sem exposicao desnecessaria.

Admin registra:

- nome do revisor;
- papel/funcao;
- decisao;
- checklist;
- notas internas.

## Admin

Atualizado:

- `/comun/admin/dossies/[id]`

Nova secao:

- `Revisoes editoriais`

Mostra:

- revisoes factuais;
- revisoes editoriais;
- decisao;
- revisor;
- data;
- notas;
- checklist.

Acoes:

- registrar revisao factual;
- registrar revisao editorial;
- solicitar ajustes via decisao `changes_requested`;
- rejeitar via decisao `rejected`;
- aprovar etapa via decisao `approved`.

## Bloqueio de publicacao

A action de publicacao agora bloqueia quando faltar:

- revisao factual aprovada;
- revisao editorial aprovada;
- revisores distintos.

Tambem continua exigindo:

- `review_status='approved'`;
- `public_title`;
- `public_summary`;
- `public_body`;
- `public_slug`.

Quando o bloqueio acontece, registra auditoria:

- `pauta_dossier_publication_blocked_missing_reviews`

## Auditoria

Registrado:

- `pauta_dossier_factual_review_created`;
- `pauta_dossier_editorial_review_created`;
- `pauta_dossier_review_changes_requested`;
- `pauta_dossier_review_rejected`;
- `pauta_dossier_publication_blocked_missing_reviews`.

## Seguranca

Confirmado:

- notas de revisao nao aparecem publicamente;
- checklist de revisao nao aparece publicamente;
- rota publica segue usando apenas `public_title`, `public_summary` e `public_body`;
- `raw_text`, `private_contact`, `internal_notes`, `response_text`, signed URL e `storage_path` seguem bloqueados;
- despublicar continua removendo acesso publico.

## Documentacao

Atualizados:

- `docs/dossies-por-pauta.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`.

## Smokes

Novo smoke:

- `scripts/smoke-comun-pauta-dossier-double-review.mjs`
- `npm run smoke:pauta-dossier-double-review`

Cobertura:

1. cria pauta teste;
2. cria dossie;
3. prepara versao publica;
4. confirma bloqueio sem revisao;
5. registra revisao factual;
6. confirma bloqueio com apenas revisao factual;
7. registra revisao editorial com mesmo nome;
8. confirma bloqueio por mesmo revisor;
9. registra revisao editorial com nome diferente;
10. publica;
11. confirma rota publica;
12. confirma que notas/checklists internos nao aparecem;
13. despublica;
14. limpa dados de teste.

## Verificacao local

Executados e aprovados:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run verify`.

Contra servidor local da build atual em `http://127.0.0.1:3019`, executados e aprovados:

- `npm run smoke:pauta-dossier-publication`;
- `npm run smoke:pauta-dossier-double-review`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-59rsgqo2l-alexandrevrabandonada-oss-projects.vercel.app`

## Smokes em producao

Com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`, executados e aprovados:

- `npm run smoke:pauta-dossier-publication`;
- `npm run smoke:pauta-dossier-double-review`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Riscos restantes

1. O sistema usa nome informado para distinguir revisores; ainda nao vincula revisao a conta/usuario autenticado como identidade obrigatoria.
2. Ainda nao ha painel agregado de revisoes pendentes por etapa.
3. Ainda nao ha notificacao automatica quando um dossie precisa de revisao factual ou editorial.

## Proximo tijolo recomendado

Criar fila administrativa de revisoes de dossies, com filtros por etapa pendente, idade do rascunho, status editorial e responsavel.
