# Estado COMUN Sprint 17 - pautas sociais

Data: 2026-07-07

## Objetivo

Transformar pautas em espacos sociais horizontais de discussao, sintese, proposta e acao, sem criar feed generico, likes, seguidores ou comentarios soltos.

## Rotas criadas/atualizadas

- `/comun/pautas`: listagem publica de pautas em construcao.
- `/comun/pautas/[slug]`: espaco social publico da pauta, com fallback para pautas antigas.
- `/comun/admin/pautas`: criacao e listagem admin de pautas sociais.
- `/comun/admin/pautas/[id]`: edicao da pauta, moderacao de contribuicoes e gestao de tarefas.

## Modelagem

Migration aplicada:

- `supabase/migrations/20260707182045_pauta_spaces.sql`

Tabelas:

- `comun_pauta_spaces`
- `comun_pauta_contributions`
- `comun_pauta_tasks`

RLS:

- leitura publica apenas de pautas `visibility='public'` e nao arquivadas;
- leitura publica apenas de contribuicoes `approved`;
- leitura publica apenas de tarefas nao arquivadas;
- escrita publica direta nao foi liberada via Data API; criacao de contribuicao passa por server action.

## Fluxo publico

`/comun/pautas` mostra:

- titulo `Pautas em construcao`;
- explicacao curta;
- cards de pauta;
- status;
- comunidade/categoria;
- total de relatos/protocolos;
- destaque de vencidos;
- CTA `Abrir pauta`.

`/comun/pautas/[slug]` mostra:

- cabecalho;
- sintese publica;
- numeros principais;
- relatos sanitizados;
- protocolos agregados sem resposta completa;
- contribuicoes aprovadas agrupadas por tipo;
- formulario publico de contribuicao;
- tarefas publicas.

## Fluxo admin

Admin pode:

- criar pauta manualmente;
- editar titulo, slug, resumo, status, visibilidade, sintese publica e proximo passo;
- ver contadores;
- abrir pagina publica;
- arquivar via status/visibilidade;
- criar pauta a partir dos sinais de `Possiveis dossies` no painel de protocolos oficiais.

## Moderacao

Contribuicoes publicas entram como `pending`.

Admin pode:

- aprovar;
- rejeitar;
- arquivar;
- editar nota de moderacao.

Auditoria:

- `pauta_contribution_approved`
- `pauta_contribution_rejected`
- `pauta_contribution_archived`

## Tarefas

Admin pode:

- criar tarefa;
- editar tarefa;
- mudar status;
- arquivar tarefa.

Auditoria:

- `pauta_task_created`
- `pauta_task_updated`
- `pauta_task_archived`

## Seguranca

Nao aparecem publicamente:

- `raw_text`;
- `private_contact`;
- `internal_notes`;
- `response_text` completo;
- signed URLs;
- `storage_path`;
- contribuicoes pendentes;
- contato privado de contribuicao.

Atualizado:

- `/comun/seguranca`
- `docs/pautas-sociais.md`
- `docs/operacao-comun.md`
- `docs/protocolo-popular.md`
- `docs/deploy-checklist.md`

## Smokes locais

Executados:

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `npm run smoke:official-protocol`: passou.
- `npm run smoke:official-protocols-admin`: passou.
- `npm run smoke:official-protocols-metrics`: passou.
- `npm run smoke:pauta-spaces`: passou.
- `npm run smoke:no-leak-http`: passou.
- `npm run smoke:public-ui`: passou.

Observacao: apos rebuild, foi necessario reiniciar o `next start` local para os smokes HTTP pegarem a build nova.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-mkrs1ivg5-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:pauta-spaces`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:official-protocols-metrics`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou.

## Riscos restantes

1. Admin de pauta ainda e simples, sem abas visuais reais.
2. Nao ha login publico; contribuicoes publicas dependem de moderacao posterior.
3. Nao ha rate limit especifico para contribuicoes de pauta neste sprint.
4. Dossie final ainda nao e criado; pauta apenas prepara organizacao.

## Proximo tijolo recomendado

Adicionar protecao anti-abuso para contribuicoes publicas de pauta: rate limit por IP/hash, captcha leve ou desafio simples, e fila de moderacao com filtros por risco.
