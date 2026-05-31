# Estado COMUN Sprint 12.1 - curadoria de anexos no remoto

Data: 2026-05-31

## Objetivo

Aplicar a migration de curadoria segura de anexos no Supabase remoto, validar buckets, rodar o smoke de curadoria e publicar em producao somente depois da validacao.

## Status da migration remota

Migration aplicada: sim.

Arquivo:

- [supabase/migrations/202605310001_attachment_curation.sql](</C:/Projetos/COMUM VR ABANDONADA/supabase/migrations/202605310001_attachment_curation.sql>)

Comando usado:

```bash
npx supabase db push --linked --password <SUPABASE_DB_PASSWORD> --yes
```

A senha do banco foi usada apenas como variavel de processo no comando. Ela nao foi gravada em arquivo versionado nem impressa no relatorio.

## Ajuste de SQL

Nao foi necessario ajustar o SQL.

A migration aplicou sem erro no remoto depois de fornecer a senha do banco ao Supabase CLI.

## Status das colunas

Confirmado no remoto que `comun_report_attachments` aceita consulta das colunas:

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

## Status das constraints

Migration aplicada com:

- remoção da constraint antiga `comun_report_attachments_private_default_check`;
- criação da constraint `comun_report_attachments_review_status_check`;
- criação da constraint `comun_report_attachments_public_ready_check`;
- criação da constraint `comun_report_attachments_public_bucket_check`.

Regra esperada:

- `public_approved=true` só é permitido quando `review_status='public_ready'`, existe bucket/path público seguro e existe `public_approved_at`.

O smoke confirmou que reprovação mantém `public_approved=false` e que a versão segura é registrada sem alterar o original.

## Status dos buckets

Comando:

```bash
npm run storage:setup
```

Resultado:

- `comun-report-attachments`: existe e está privado;
- `comun-public-safe-attachments`: existe e está privado.

## Status do smoke de curadoria

Comando:

```bash
npm run smoke:attachment-curation
```

Resultado: passou.

Cobertura validada:

- bucket original privado;
- bucket de versão pública segura privado;
- anexo original criado como `pending`;
- `public_approved=false` por padrão;
- `needs_redaction` registrado;
- auditoria de redaction registrada;
- reprovação mantém anexo sem aprovação pública;
- versão pública segura fake enviada ao bucket separado;
- `public_approved=true` somente com versão segura separada;
- página pública não vaza original, signed URL nem storage paths;
- registros e arquivos de smoke removidos.

## Status do teste manual local

Não executado com navegador e login real.

Motivo:

- o ambiente atual não tem a senha interativa do admin para completar login real;
- o teste com foto real/editada depende de ação humana para selecionar/editar imagem.

Substituição técnica executada:

- smoke automatizado criou relato, anexo original, marcou `needs_redaction`, subiu versão segura, validou auditoria e validou ausência de vazamento público.

## Status do deploy

Deploy feito: sim.

Comando:

```bash
npx vercel deploy --prod --yes
```

URL pública:

- [https://comunvrabandonada.vercel.app](https://comunvrabandonada.vercel.app)

Build Vercel:

- passou;
- alias de produção atualizado.

## Smokes em produção

Rodados com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`:

- `npm run smoke:no-leak-http`: passou
- `npm run smoke:public-ui`: passou
- `npm run smoke:quick-report`: passou
- `npm run smoke:attachment-curation`: passou
- `npm run smoke:admin-auth`: passou
- `npm run smoke:protocol-follow`: passou
- `npm run smoke:protocol-rate-limit`: passou

## Verify local

Comando:

```bash
npm run verify
```

Resultado:

- `lint`: passou;
- `typecheck`: passou;
- `build`: passou.

Tambem passaram localmente contra `http://localhost:4023`:

- `npm run smoke:comun`
- `npm run smoke:admin-auth`
- `npm run smoke:no-leak-http`
- `npm run smoke:public-ui`
- `npm run smoke:protocol-follow`
- `npm run smoke:protocol-rate-limit`
- `npm run smoke:quick-report`
- `npm run smoke:attachment-curation`

## Status do teste manual em produção

Não executado com foto real/editada por depender de:

- senha admin real;
- ação humana no navegador;
- imagem real ou editada escolhida manualmente.

Roteiro pendente:

1. abrir `/comun/relatar` em produção;
2. enviar relato rápido com foto simples sem rosto/documento/placa;
3. entrar no admin;
4. abrir relato;
5. confirmar anexo original por signed URL temporária;
6. marcar como precisa de blur/redação;
7. subir versão pública segura editada/fake;
8. confirmar auditoria;
9. abrir acompanhamento público;
10. confirmar que original e signed URL não aparecem.

## Privacidade confirmada

Original segue privado:

- bucket original privado;
- attachment original permanece separado;
- `storage_path` original não é exposto em páginas públicas;
- signed URL só é gerada no admin.

Versão pública segura:

- fica em bucket separado `comun-public-safe-attachments`;
- também privado;
- só é registrada quando `review_status='public_ready'`;
- o helper público não retorna o path original.

Páginas públicas:

- não exibem signed URL;
- não exibem `storage_path`;
- não exibem filename sensível;
- não exibem imagem original.

## Arquivos versionados no commit

Commit:

- `fix: aplica e valida curadoria segura de anexos`

Incluiu:

- migration de curadoria;
- smoke de curadoria;
- docs de curadoria;
- relatório Sprint 12;
- ajustes admin/actions/helpers já implementados no Sprint 12.

## Riscos restantes

1. Falta teste manual com foto real/editada em produção por usuário com credencial admin.
2. Ainda não há editor de blur/redação dentro do app; a equipe edita fora e sobe a versão segura.
3. Ainda não há fila dedicada de anexos pendentes; por enquanto a curadoria parte da inbox/revisão do relato.

## Próximo tijolo recomendado

Criar uma fila operacional de anexos pendentes no admin, com filtros por `pending`, `needs_redaction`, `rejected` e `public_ready`, para reduzir esforço quando houver volume maior de fotos.
