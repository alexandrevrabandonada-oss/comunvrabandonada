# COMUN VR ABANDONADA

Plataforma comunitaria de relatos, debates e memoria coletiva ligada ao ecossistema VR Abandonada.

Frase-guia: **Relatar. Confirmar. Organizar. Transformar em acao.**  
Assinatura: **Escutar. Cuidar. Organizar.**

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres e Storage preparado para anexos futuros
- Vercel como destino de deploy

## Rodar local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000/comun`.

## Variaveis

Configure em `.env.local` e na Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMUN_ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`, opcional para `db:types`

Nunca commite `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, token de acesso ou senha do banco.

## Supabase

A migration inicial esta em `supabase/migrations/202605070001_initial_comun.sql`.

```bash
npm run db:push
```

Ela cria tabelas, view publica segura, RLS e seeds iniciais.

## Verificacao

```bash
npm run lint
npm run typecheck
npm run build
npm run verify
```

## Rotas principais

- `/comun`
- `/comun/relatar`
- `/comun/comunidades`
- `/comun/c/[slug]`
- `/comun/pautas/[slug]`
- `/comun/seguranca`
- `/comun/dossies`
- `/comun/admin`

## GitHub

```bash
git init
git add .
git commit -m "feat: cria MVP inicial do COMUN VR Abandonada"
git remote add origin https://github.com/alexandrevrabandonada-oss/comunvrabandonada.git
git branch -M main
git push -u origin main
```
