# Estado COMUN Sprint 18.1 - fechamento remoto do rascunho de dossie

Data: 2026-07-07

## Objetivo

Fechar o Sprint 18 em producao, confirmando migration remota, deploy, smokes em producao e seguranca do rascunho admin de Dossie por Pauta.

## Diagnostico

Arquivos conferidos:

- `reports/estado-comun-sprint-18-dossie-por-pauta-rascunho.md`;
- `package.json`;
- `supabase/migrations/20260707203422_pauta_dossier_drafts.sql`;
- `docs/deploy-checklist.md`.

Migration local confirmada:

- `supabase/migrations/20260707203422_pauta_dossier_drafts.sql`.

Tabelas remotas confirmadas via Supabase service role:

- `comun_pauta_dossiers`: ok;
- `comun_pauta_dossier_evidence`: ok.

As tabelas estavam vazias apos limpeza dos smokes, como esperado.

## Verificacao local curta

Executados e aprovados:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run smoke:pauta-dossier-draft`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Deploy

Status: producao ja publicada e confirmada.

URL final:

- `https://comunvrabandonada.vercel.app`

Deploy de referencia do Sprint 18:

- `https://comunvrabandonada-jxxnkxpgl-alexandrevrabandonada-oss-projects.vercel.app`

Alias de producao confirmado:

- `https://comunvrabandonada.vercel.app`

## Smokes em producao

Com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`, executados e aprovados:

- `npm run smoke:pauta-dossier-draft`;
- `npm run smoke:pauta-editorial-quality`;
- `npm run smoke:pauta-contribution-safety`;
- `npm run smoke:pauta-spaces`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Seguranca

Confirmado:

- preview do dossie continua em rota admin-only: `/comun/admin/dossies/[id]/preview`;
- nao existe publicacao automatica de `public_version` em rota publica;
- smoke de dossie confirma que a pauta publica nao expoe dados internos do rascunho;
- dados sensiveis seguem bloqueados: `raw_text`, `private_contact`, `response_text` completo, `internal_notes`, signed URLs e `storage_path`;
- evidencias `private_only` nao entram no rascunho de dossie validado pelo smoke.

## Git

Status antes do relatorio:

- sem mudancas rastreadas pendentes;
- `backups/` permanece untracked e fora do escopo.

## Riscos restantes

1. O dossie ainda nao possui publicacao publica revisada.
2. O checklist do editor ainda e operacional e nao bloqueia status automaticamente.
3. Ainda nao ha aprovacao em duas pessoas antes de marcar `ready`.
4. Ainda nao existe rotina automatica para detectar dossies parados em `draft` ou `in_review`.

## Proximo tijolo recomendado

Criar workflow de aprovacao editorial do dossie, com revisao em duas etapas e publicacao publica apenas a partir de uma versao revisada separada do rascunho interno.
