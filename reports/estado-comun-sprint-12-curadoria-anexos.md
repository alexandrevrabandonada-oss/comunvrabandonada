# Estado COMUN Sprint 12 - curadoria segura de anexos

Data: 2026-05-31

## Objetivo

Criar fluxo administrativo para curadoria de anexos privados, mantendo o arquivo original privado e impedindo publicacao publica automatica.

## Migration

- [supabase/migrations/202605310001_attachment_curation.sql](</C:/Projetos/COMUM VR ABANDONADA/supabase/migrations/202605310001_attachment_curation.sql>)

Campos adicionados em `comun_report_attachments`:

- `review_status`
- `public_storage_bucket`
- `public_storage_path`
- `public_mime_type`
- `public_size_bytes`
- `needs_redaction`
- `redaction_notes`
- `reviewed_by`
- `reviewed_at`
- `public_approved_at`

Tambem foi removida a constraint antiga que obrigava `public_approved=false`, substituida por regra que permite `public_approved=true` apenas quando `review_status='public_ready'`, existe `public_storage_path` e existe `public_approved_at`.

## Buckets

- `comun-report-attachments`: original privado.
- `comun-public-safe-attachments`: versao publica segura, tambem privada.

Status local/remoto via service role:

- `npm run storage:setup` passou.
- `comun-report-attachments` existe e esta privado.
- `comun-public-safe-attachments` foi criado como privado.

## Admin

Arquivo principal:

- [app/comun/admin/relatos/[id]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/relatos/[id]/page.tsx>)

A tela de revisao agora mostra, por anexo:

- miniatura via signed URL temporaria;
- nome, tipo e tamanho;
- status de revisao;
- `public_approved`;
- `needs_redaction`;
- notas de redacao;
- aviso de que o original e privado.

Acoes implementadas:

- aprovar apenas para uso interno;
- marcar como precisa de blur/redacao com nota obrigatoria;
- reprovar anexo;
- enviar versao publica segura ja redigida/blurada.

O fluxo nao edita imagem no navegador. A equipe baixa, edita fora e sobe nova imagem segura.

## Server Actions

Arquivo:

- [app/actions.ts](</C:/Projetos/COMUM VR ABANDONADA/app/actions.ts>)

Acoes criadas:

- `updateAttachmentReviewStatus`
- `markAttachmentNeedsRedaction`
- `rejectAttachment`
- `uploadPublicSafeAttachment`

Todas exigem `requireComunAdmin()`.

## Auditoria

Eventos registrados:

- `attachment_review_updated`
- `attachment_marked_needs_redaction`
- `attachment_rejected`
- `attachment_public_safe_uploaded`

Metadata registrada:

- `attachment_id`
- `report_id`
- `review_status`
- `has_public_safe_version`
- tamanho/tipo da versao segura quando aplicavel

O sanitizador de auditoria tambem bloqueia `storage_path`, `signed_url` e `signedUrl`.

## Consulta publica segura

Helper criado:

- `getPublicSafeAttachmentsForReport(reportId)` em [lib/reports.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/reports.ts>)

Ele retorna apenas anexos com:

- `public_approved=true`;
- `review_status='public_ready'`;
- `public_storage_path` preenchido.

O helper nao foi conectado a nenhuma pagina publica neste tijolo.

## Inbox admin

Arquivo:

- [app/comun/admin/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/admin/page.tsx>)

Adicionado:

- estatistica `Fotos pendentes`;
- filtro `Anexo pendente`;
- badge `Foto pendente`.

## Documentacao

Atualizados:

- [docs/storage.md](</C:/Projetos/COMUM VR ABANDONADA/docs/storage.md>)
- [docs/operacao-comun.md](</C:/Projetos/COMUM VR ABANDONADA/docs/operacao-comun.md>)
- [docs/deploy-checklist.md](</C:/Projetos/COMUM VR ABANDONADA/docs/deploy-checklist.md>)
- [docs/env.md](</C:/Projetos/COMUM VR ABANDONADA/docs/env.md>)

Criado:

- [docs/curadoria-anexos.md](</C:/Projetos/COMUM VR ABANDONADA/docs/curadoria-anexos.md>)

## Smokes e verificacoes

Passaram:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run storage:setup`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:comun`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:admin-auth`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:no-leak-http`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:public-ui`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:protocol-follow`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:protocol-rate-limit`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:quick-report`

Bloqueado:

- `npm run smoke:attachment-curation`

Motivo:

- a migration `202605310001_attachment_curation.sql` ainda nao foi aplicada no banco remoto;
- erro confirmado: `column comun_report_attachments.review_status does not exist`.

## Deploy

Nao realizado.

Motivo:

- `npx supabase db push` falhou por permissao/senha do banco:
  `permission denied to alter role` e orientacao da CLI para configurar `SUPABASE_DB_PASSWORD`.
- Fazer deploy antes da migration quebraria rotas admin que consultam `review_status`.

## Politica de publicacao de imagem

- original nunca fica publico automaticamente;
- `public_approved` so fica `true` quando existe versao publica segura separada;
- ambos os buckets continuam privados;
- paginas publicas nao exibem imagem neste tijolo;
- nenhuma signed URL e gravada em banco.

## Riscos restantes

1. Aplicar a migration no Supabase remoto com senha/permissao correta.
2. Rodar `npm run smoke:attachment-curation` depois da migration.
3. Fazer teste manual completo no admin.
4. Fazer deploy de producao somente apos os itens anteriores.

## Proximo tijolo recomendado

Aplicar a migration em producao, validar o smoke de curadoria e fazer teste manual com uma foto real/editada. Depois disso, criar uma tela operacional de fila de anexos pendentes, caso a inbox fique pequena para o volume de curadoria.
