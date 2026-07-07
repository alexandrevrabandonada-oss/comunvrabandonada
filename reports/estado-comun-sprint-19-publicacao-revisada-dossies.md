# Estado COMUN Sprint 19 - publicacao revisada de dossies

Data: 2026-07-07

## Objetivo

Criar workflow de aprovacao editorial para Dossie por Pauta, com revisao em duas etapas e publicacao publica apenas de versao revisada separada do rascunho interno.

## Modelagem

Migration criada e aplicada:

- `supabase/migrations/20260707213246_pauta_dossier_publication_workflow.sql`

Campos adicionados em `comun_pauta_dossiers`:

- `review_status`;
- `reviewed_by_editor_at`;
- `approved_for_publication_at`;
- `published_at`;
- `unpublished_at`;
- `public_slug`;
- `public_title`;
- `public_body`;
- `public_summary`;
- `publication_notes`.

Status editorial:

- `draft`;
- `editorial_review`;
- `changes_requested`;
- `approved`;
- `published`;
- `unpublished`;
- `archived`.

RLS continua habilitado. `anon` e `authenticated` seguem sem acesso direto a tabela; a leitura publica passa pelo servidor e filtra apenas dossies publicados.

## Workflow admin

Atualizado:

- `/comun/admin/dossies`;
- `/comun/admin/dossies/[id]`;
- `/comun/admin/dossies/[id]/preview`.

O editor ganhou bloco `Workflow editorial` com acoes:

- enviar para revisao editorial;
- solicitar ajustes;
- aprovar;
- publicar;
- despublicar;
- arquivar.

Regras implementadas:

- publicar exige `review_status='approved'`;
- aprovar exige checklist de seguranca marcado;
- publicar exige `public_title`, `public_summary`, `public_body` e `public_slug`;
- alteracoes no rascunho interno nao alteram pagina publica automaticamente.

## Versao publica revisada

O editor separa:

- campos internos e operacionais;
- campos publicos revisados.

Campos publicos:

- `public_title`;
- `public_summary`;
- `public_body`;
- `public_slug`.

Botao criado:

- `Preparar versao publica a partir do rascunho`.

Esse botao preenche os campos publicos, mas ainda exige revisao humana antes de aprovar e publicar.

## Rotas publicas

Atualizadas:

- `/comun/dossies`;
- `/comun/dossies/[slug]`.

A pagina publica nova aparece somente quando:

- `review_status='published'`;
- `published_at` nao e nulo;
- `unpublished_at` e nulo.

A rota publica usa apenas:

- `public_title`;
- `public_summary`;
- `public_body`;
- pauta relacionada;
- data de publicacao.

Conteudo legado de dossies estaticos foi preservado como fallback quando nao ha dossie por pauta publicado com o slug solicitado.

## Auditoria

Actions registram:

- `pauta_dossier_sent_to_review`;
- `pauta_dossier_changes_requested`;
- `pauta_dossier_approved`;
- `pauta_dossier_published`;
- `pauta_dossier_unpublished`;
- `pauta_dossier_archived`;
- `pauta_dossier_public_version_prepared`;
- `pauta_dossier_public_version_updated`.

## Seguranca

Confirmado:

- rota publica nao mostra dossie antes de publicar;
- despublicar remove acesso publico;
- `public_version` antigo nao e usado na rota publica;
- `internal_notes` nao aparecem no preview publico nem na rota publica;
- `raw_text`, `private_contact`, `response_text`, signed URL e `storage_path` nao aparecem nos smokes;
- evidencias `private_only`, `candidate`, `rejected` e `archived` nao entram como conteudo publico do dossie.

## Documentacao

Criado:

- `docs/dossies-por-pauta.md`.

Atualizados:

- `docs/pautas-sociais.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`.

## Smokes

Novo smoke:

- `scripts/smoke-comun-pauta-dossier-publication.mjs`
- `npm run smoke:pauta-dossier-publication`

Cobertura:

1. cria pauta teste;
2. cria evidencia `approved + public_safe`;
3. cria dossie;
4. prepara versao publica;
5. confirma que rota publica nao aparece antes de publicar;
6. envia para revisao;
7. aprova;
8. publica;
9. confirma `/comun/dossies/[slug]`;
10. confirma listagem `/comun/dossies`;
11. confirma ausencia de dados sensiveis;
12. despublica;
13. confirma que rota publica deixa de aparecer;
14. limpa dados de teste.

## Verificacao local

Executados e aprovados:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run verify`;
- `npm run smoke:pauta-dossier-draft`;
- `npm run smoke:pauta-editorial-quality`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

O smoke `npm run smoke:pauta-dossier-publication` foi executado contra servidor local da build atual em `http://127.0.0.1:3019` e passou.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-br1ym7hon-alexandrevrabandonada-oss-projects.vercel.app`

## Smokes em producao

Com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`, executados e aprovados:

- `npm run smoke:pauta-dossier-draft`;
- `npm run smoke:pauta-dossier-publication`;
- `npm run smoke:pauta-editorial-quality`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Riscos restantes

1. Checklist de seguranca ainda e enviado por formulario e nao persiste como historico estruturado.
2. Ainda nao ha exigencia real de duas pessoas distintas para aprovacao.
3. Ainda nao ha painel de dossies publicados com metricas editoriais.
4. Ainda nao ha alerta automatico para dossie publicado/despublicado.

## Proximo tijolo recomendado

Criar aprovacao editorial com dois revisores distintos e trilha de revisao estruturada por dossie, antes de avancar para propostas coletivas.
