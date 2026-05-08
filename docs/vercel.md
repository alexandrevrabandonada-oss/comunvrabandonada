# Deploy na Vercel

## Build

Comando padrao:

```bash
npm run build
```

## Variaveis na Vercel

Configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMUN_ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`

Nao configure tokens pessoais no frontend. `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas como env server-side.

## Depois do deploy

1. Rode a migration no Supabase.
2. Teste `/comun`.
3. Envie um relato por `/comun/relatar`.
4. Acesse `/comun/admin` com a senha.
5. Sanitize e publique um relato autorizado.
