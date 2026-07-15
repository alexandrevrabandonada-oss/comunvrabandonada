# COMUN VR ABANDONADA

O Mapa Popular em `/comun/mapa` organiza reciclagem, cooperativas, necessidades e áreas de interesse público na mesma fundação territorial do Hub.

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
- `COMUN_BOOTSTRAP_ADMIN_EMAIL`, opcional e usado apenas no bootstrap local/admin
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`, opcional para `db:types`

Nunca commite `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, token de acesso ou senha do banco.

## Supabase

A migration inicial esta em `supabase/migrations/202605070001_initial_comun.sql`.
O admin usa Supabase Auth SSR com allowlist em `comun_admin_users`.

```bash
npm run db:push
```

Ela cria tabelas, view publica segura, RLS e seeds iniciais.

Para liberar o primeiro admin, crie antes o usuario em Supabase Auth e rode:

```bash
npm run bootstrap:admin -- --email email@exemplo.com
```

## Verificacao

```bash
npm run lint
npm run typecheck
npm run build
npm run verify
npm run smoke:comun
npm run smoke:admin-auth
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
git add .
git commit -m "feat: cria COMUN VR Abandonada v0"
git branch -M main
git remote add origin <URL_DO_REPOSITORIO_GITHUB>
git push -u origin main
```
# COMUN — hub central da organização popular

O fluxo principal do produto é relato → pauta → evidência → ação → acompanhamento → resultado → memória. Rotas centrais: `/comun/pautas`, `/comun/acoes`, `/comun/participar`, `/comun/territorios`, `/comun/projetos`, `/comun/resultados` e `/comun/busca`. O Acervo Vivo preserva a memória e permanece integrado sem dominar a home.
