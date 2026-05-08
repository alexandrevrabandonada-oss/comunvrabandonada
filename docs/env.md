# Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon para insercao publica com RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa. Use somente no servidor.
- `COMUN_ADMIN_PASSWORD`: senha simples do admin v0.
- `NEXT_PUBLIC_SITE_URL`: URL publica do site.
- `SUPABASE_PROJECT_ID`: usado apenas para gerar tipos.

Nao coloque service role, token de acesso pessoal ou senha do banco em arquivos versionados.
