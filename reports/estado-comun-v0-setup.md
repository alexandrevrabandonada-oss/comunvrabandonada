# Estado da Nacao - COMUN v0 Setup

## Resumo

Foi criado do zero o projeto `comun-vr-abandonada`, uma plataforma mobile-first para relatos comunitarios, curadoria interna e publicacao sanitizada.

## Stack usada

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Server Actions
- Vercel-ready

## Rotas criadas

- `/` redireciona para `/comun`
- `/comun`
- `/comun/relatar`
- `/comun/relatar/confirmacao`
- `/comun/comunidades`
- `/comun/c/[slug]`
- `/comun/pautas/[slug]`
- `/comun/seguranca`
- `/comun/dossies`
- `/comun/dossies/[slug]`
- `/comun/admin`
- `/comun/admin/relatos`
- `/comun/admin/relatos/[id]`
- `/comun/admin/pautas`

## Tabelas e migrations

Migration: `supabase/migrations/202605070001_initial_comun.sql`.

Cria:

- `comun_reports`
- `comun_communities`
- `comun_issues`
- `comun_dossiers`
- `comun_actions`
- view segura `comun_public_reports`

## Variaveis necessarias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMUN_ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run verify
```

## Limitacoes conhecidas

- Upload de anexos ficou como placeholder.
- Admin usa senha simples por cookie, suficiente para v0.
- Edicao persistente de pautas no admin ficou para proximo tijolo.
- Sem Supabase configurado, envio de relato retorna erro documentado e admin fica vazio.

## Riscos

- O fluxo depende de RLS aplicada corretamente no Supabase.
- A senha simples do admin deve ser forte e mantida em variavel de ambiente.
- Curadoria humana e obrigatoria para evitar exposicao de dados sensiveis.

## Proximos tijolos recomendados

1. Upload seguro de anexos com Storage privado e politica de retencao.
2. CRUD administrativo real de pautas e dossies.
3. Auditoria de publicacao e historico de revisoes.
4. Painel de padroes recorrentes sem feed social.
5. Testes automatizados de server actions e RLS.

## Status verify/build

Executado em 2026-05-07:

- `npm install`: passou e gerou `package-lock.json`.
- `npm run lint`: passou sem avisos.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.

Observacao: durante a primeira tentativa sequencial, o disco C: ficou sem espaco ao escrever cache da `.next`. O cache gerado foi removido, cerca de 3,4 GB foram liberados e `npm run verify` passou em seguida.

## Segredos

Foi feita busca nos arquivos de fonte, docs e relatorios. Nao foram gravados valores reais de `service_role`, token de acesso, anon key ou senha do banco. Apenas nomes de variaveis e placeholders aparecem no projeto.
