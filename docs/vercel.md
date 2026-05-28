# Deploy na Vercel

## Readiness

Este projeto usa Next.js App Router e deve funcionar no deploy padrao da Vercel. Nao ha necessidade atual de `vercel.json`.

## Variaveis obrigatorias

Configure no painel da Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`
- `COMUN_LOOKUP_HASH_SALT`

Tratamento esperado:

- `SUPABASE_SERVICE_ROLE_KEY` e sensivel e deve existir apenas como env var do painel;
- nao commite segredos no GitHub;
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` podem existir como env publica no app, mas ainda assim devem ser gerenciadas pela Vercel;
- `SUPABASE_PROJECT_ID` e util para tooling e alinhamento operacional entre local, Supabase CLI e Vercel.
- `COMUN_LOOKUP_HASH_SALT` protege os hashes da observabilidade publica por protocolo. Gere um valor longo e aleatorio no painel da Vercel.

`COMUN_ADMIN_PASSWORD` esta deprecated e nao deve ser usada em novos deploys. O admin usa Supabase Auth com cookies SSR e allowlist `comun_admin_users`.
`COMUN_BOOTSTRAP_ADMIN_EMAIL` e opcional, apenas para rodar bootstrap fora do runtime publico.

## Ambientes

Defina as variaveis conforme necessidade em:

- `Production`: ambiente oficial do dominio publico;
- `Preview`: validacao de PRs e branches;
- `Development`: alinhamento com o uso local via integracao da Vercel, se adotado depois.

Recomendacao pratica:

- comece configurando tudo em `Production`;
- replique em `Preview` se quiser validar branches com Supabase real;
- use `Development` apenas se fizer sentido no seu fluxo.

## Build padrao

```bash
npm run build
```

Tambem valide antes do push:

```bash
npm run verify
npm run smoke:comun
npm run smoke:admin-auth
npm run smoke:protocol-follow
npm run smoke:protocol-rate-limit
```

Depois de publicar um relato sanitizado real de teste, rode tambem um check HTTP de nao vazamento:

```bash
npm run smoke:no-leak-http -- --path /comun/pautas/<slug> --required "<public_text>" --forbidden "<texto-sensivel>"
```

## Supabase antes do primeiro deploy

Se o projeto ainda nao estiver migrado no Supabase:

1. rode `supabase login`
2. rode `supabase link --project-ref <SUPABASE_PROJECT_ID>`
3. rode `supabase db push`

Se o `db push` pedir senha do banco no seu ambiente, defina `SUPABASE_DB_PASSWORD` localmente antes de rodar.

## Import na Vercel

1. importe o repositorio GitHub na Vercel;
2. confirme o framework como `Next.js`;
3. mantenha build command padrao;
4. configure todas as env vars no painel;
5. execute o primeiro deploy.

## Depois do primeiro deploy

1. abra a URL publicada;
2. se necessario, atualize `NEXT_PUBLIC_SITE_URL` com a URL real de producao;
3. rode novo deploy apos qualquer ajuste de env var;
4. crie o usuario em Supabase Auth e rode `npm run bootstrap:admin -- --email email@exemplo.com`;
5. teste `/comun`, `/comun/relatar`, `/comun/admin/login` e `/comun/admin`;
6. publique um relato sanitizado de teste e confira a pauta publica;
7. confira `/comun/admin/auditoria`;
8. valide no celular e em links abertos via Instagram/WhatsApp.
