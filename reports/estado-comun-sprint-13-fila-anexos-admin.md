# Estado COMUN Sprint 13 - fila admin de anexos

Data: 2026-05-31

## Objetivo

Criar uma fila operacional de anexos no admin para revisar fotos sem abrir relato por relato.

## Rota criada

- `/comun/admin/anexos`
- Acesso protegido por `requireComunAdmin()`.
- Link adicionado ao `AdminShell` como `Anexos`.

## Filtros

- Status: `pending`, `needs_redaction`, `rejected`, `public_ready`, `approved_private` e todos.
- Comunidade.
- Com ou sem versao publica segura.
- Data inicial e final.
- Paginacao simples com `page` e limite de 25 anexos por pagina.

## Acoes disponiveis

- Aprovar apenas para uso interno.
- Marcar precisa de blur/redacao.
- Reprovar.
- Enviar versao publica segura.
- Abrir relato.

As acoes reutilizam as Server Actions existentes e registram:

- `attachment_review_updated`
- `attachment_marked_needs_redaction`
- `attachment_rejected`
- `attachment_public_safe_uploaded`

## Signed URL

Signed URL temporaria e gerada apenas em helpers usados pelo admin.

A fila mostra miniatura privada por signed URL temporaria, sem exibir `storage_path` completo nem nome sensivel como dado operacional.

## Nao vazamento

O original segue no bucket privado `comun-report-attachments`.

Versao segura segue separada no bucket privado `comun-public-safe-attachments`.

Paginas publicas continuam sem exibir original, signed URL, `storage_path` ou filename sensivel.

## Smokes

Script criado:

- `scripts/smoke-comun-admin-attachments-queue.mjs`

Comando:

- `npm run smoke:attachments-queue`

Cobertura:

- cria relato rapido com foto fake;
- confirma anexo `pending`;
- consulta a fila por filtros server-side equivalentes;
- marca `needs_redaction`;
- confirma filtro `needs_redaction`;
- sobe versao publica segura fake;
- confirma `public_ready`;
- confirma que acompanhamento publico nao vaza original, signed URL ou storage path;
- limpa registros e arquivos de teste.

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

## Deploy

Status: passou.

Comando:

- `npx vercel deploy --prod --yes`

URL de producao:

- `https://comunvrabandonada.vercel.app`

Deploy:

- `https://comunvrabandonada-cs4j40p72-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:quick-report`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:attachment-curation`: passou
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:attachments-queue`: passou

## Teste manual

Status: pendente por depender de login admin real e acao humana com foto.

Roteiro:

1. abrir `/comun/relatar` em producao;
2. enviar relato rapido com foto simples;
3. entrar no admin;
4. abrir `/comun/admin/anexos`;
5. confirmar que anexo aparece em Pendentes;
6. marcar como precisa de blur/redacao;
7. confirmar mudanca de filtro;
8. subir versao publica segura fake/editada;
9. confirmar `public_ready`;
10. abrir acompanhamento publico;
11. confirmar que original nao aparece;
12. confirmar auditoria.

## Riscos restantes

1. Ainda nao ha editor interno de blur/redacao; a edicao segue externa.
2. Teste manual com credencial admin real ainda precisa ser feito.
3. A fila lista miniaturas por signed URL no admin; a equipe deve manter disciplina de nao compartilhar links temporarios.

## Proximo tijolo recomendado

Criar uma rotina de revisao operacional com checklist diario e alertas simples para anexos pendentes antigos.
