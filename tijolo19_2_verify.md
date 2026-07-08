# Tijolo 19.2 - verificacao

Data: 2026-07-07

## Verificacao local

Executados e aprovados:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run verify`.

Build local confirmou nova rota:

- `/comun/admin/dossies/revisoes`

## Smokes locais

Contra build local em `http://127.0.0.1:3019`, executados e aprovados:

- `npm run smoke:pauta-dossier-review-queue`;
- `npm run smoke:pauta-dossier-publication`;
- `npm run smoke:pauta-dossier-double-review`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Deploy

Executado:

- `npx vercel deploy --prod --yes`

Status: passou.

Alias:

- `https://comunvrabandonada.vercel.app`

## Smokes em producao

Com `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`, executados e aprovados:

- `npm run smoke:pauta-dossier-review-queue`;
- `npm run smoke:pauta-dossier-publication`;
- `npm run smoke:pauta-dossier-double-review`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Estado git

Feature commit:

- `3165e76 feat: cria fila admin de revisoes de dossies`

Observacao:

- `backups/` permanece untracked e fora do escopo.
