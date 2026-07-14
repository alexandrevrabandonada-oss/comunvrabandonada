# Estado COMUN Sprint 13.1 - rotina operacional de anexos

Data: 2026-05-31

## Objetivo

Criar uma rotina operacional simples para revisao diaria de anexos pendentes, com indicadores, checklist e alertas visuais de prioridade.

## Indicadores criados

Na rota `/comun/admin/anexos`:

- Pendentes hoje.
- Pendentes ha mais de 24h.
- Pendentes ha mais de 72h.
- Precisam de blur/redacao.
- Prontos para versao segura.
- Reprovados.
- Public ready.

Critérios:

- pendente antigo: `review_status='pending'` e `created_at` anterior a 72h;
- atencao: `needs_redaction=true` ou `review_status='needs_redaction'`.

## Alertas visuais

Na lista de anexos:

- `Atencao` para `pending` ha mais de 24h;
- `Urgente` para `pending` ha mais de 72h;
- `Blur/redacao` para anexos que precisam de redacao;
- `Versao segura pronta` para `public_ready`.

Anexos pendentes ha mais de 72h exibem texto operacional orientando revisar, reprovar ou marcar necessidade de blur/redacao.

## Checklist diario

Bloco criado em `/comun/admin/anexos`:

- revisar anexos pendentes;
- marcar fotos sensiveis como precisa de blur/redacao;
- reprovar fotos inuteis ou arriscadas;
- subir versao publica segura quando houver edicao;
- nunca compartilhar signed URL;
- nunca publicar original;
- verificar auditoria.

## Documentacao atualizada

- `docs/curadoria-anexos.md`
- `docs/operacao-comun.md`

Inclui rotina diaria e rotina semanal de anexos.

## Teste manual

Status: pendente por depender de login admin real e envio manual de foto.

Roteiro:

1. abrir `/comun/relatar` em producao;
2. enviar relato rapido com foto simples;
3. entrar no admin;
4. abrir `/comun/admin/anexos`;
5. confirmar que aparece em Pendentes;
6. confirmar cards operacionais;
7. marcar como precisa de blur/redacao;
8. confirmar badge e filtro;
9. subir versao segura fake/editada;
10. confirmar `public_ready`;
11. abrir acompanhamento publico;
12. confirmar que original nao aparece;
13. confirmar auditoria.

## Smokes

Script criado:

- `scripts/smoke-comun-attachments-ops.mjs`

Comando:

- `npm run smoke:attachments-ops`

Status: pendente de execucao final.

Status local nesta revisao: passou.

Tambem passaram:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run storage:setup`
- `npm run smoke:comun`
- `npm run smoke:admin-auth`
- `npm run smoke:no-leak-http`
- `npm run smoke:public-ui`
- `npm run smoke:protocol-follow`
- `npm run smoke:protocol-rate-limit`
- `npm run smoke:quick-report`
- `npm run smoke:attachment-curation`
- `npm run smoke:attachments-queue`

## Deploy

Status: passou.

Comando:

- `npx vercel deploy --prod --yes`

URL de producao:

- `https://comunvrabandonada.vercel.app`

Deploy:

- `https://comunvrabandonada-njm1jv6zj-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:quick-report`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:attachment-curation`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:attachments-queue`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:attachments-ops`: passou

## Riscos restantes

1. Ainda nao ha editor interno de blur/redacao; edicao segue externa.
2. Teste manual com admin real segue pendente.
3. Alertas sao visuais e dependem da equipe abrir a fila; nao ha notificacao externa.

## Proximo tijolo recomendado

Criar uma visao de auditoria filtrada por anexos para acompanhar decisoes de curadoria e tempo medio de resolucao.
