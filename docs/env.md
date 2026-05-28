# Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon para insercao publica com RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa. Use somente no servidor.
- `COMUN_BOOTSTRAP_ADMIN_EMAIL`: opcional. Usada apenas pelo script local/admin de bootstrap do primeiro admin.
- `NEXT_PUBLIC_SITE_URL`: URL publica do site.
- `SUPABASE_PROJECT_ID`: usado apenas para gerar tipos.
- `COMUN_LOOKUP_HASH_SALT`: recomendado em producao. Salt usado para gerar hashes de IP, user-agent e protocolo nos eventos de consulta publica por protocolo. Nao e exposto ao client.

Deprecated:

- `COMUN_ADMIN_PASSWORD`: senha simples do admin v0. Nao e mais usada no fluxo principal; o admin agora depende de Supabase Auth e da allowlist `comun_admin_users`.

Quando migrar para nomes novos do Supabase, mantenha compatibilidade ate ajustar o app:

- client: publishable key publica equivalente a `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- servidor: secret/service role key apenas como `SUPABASE_SERVICE_ROLE_KEY`.

Nao coloque service role, token de acesso pessoal ou senha do banco em arquivos versionados.
