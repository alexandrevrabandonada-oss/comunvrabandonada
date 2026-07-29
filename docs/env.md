# Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon para insercao publica com RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa. Use somente no servidor.
- `COMUN_BOOTSTRAP_ADMIN_EMAIL`: opcional. Usada apenas pelo script local/admin de bootstrap do primeiro admin.
- `NEXT_PUBLIC_SITE_URL`: URL publica do site.
- `SUPABASE_PROJECT_ID`: usado apenas para gerar tipos.
- `COMUN_LOOKUP_HASH_SALT`: recomendado em producao. Salt usado para gerar hashes de IP, user-agent e protocolo nos eventos de consulta publica por protocolo. Nao e exposto ao client.
- `NEXT_PUBLIC_HCAPTCHA_SITEKEY`: override opcional da sitekey publica usada no bootstrap anonimo das contribuicoes. O Mapa de Calcadas possui uma sitekey publica canonica; nunca coloque a secret key do hCaptcha na Vercel, no cliente ou no repositorio.

A secret key do hCaptcha pertence exclusivamente a configuracao protegida do Supabase Auth em Bot and Abuse Protection. Anonymous Sign-Ins so devem ser habilitados depois que essa protecao estiver ativa.

Storage:

- `SUPABASE_SERVICE_ROLE_KEY` tambem e usada no servidor para upload privado nos buckets `comun-report-attachments` e `comun-public-safe-attachments`.
- Nao ha nova variavel obrigatoria para relato rapido ou curadoria de anexos.
- Os buckets devem ser privados e podem ser criados/validados com `npm run storage:setup`.

Deprecated:

- `COMUN_ADMIN_PASSWORD`: senha simples do admin v0. Nao e mais usada no fluxo principal; o admin agora depende de Supabase Auth e da allowlist `comun_admin_users`.

Quando migrar para nomes novos do Supabase, mantenha compatibilidade ate ajustar o app:

- client: publishable key publica equivalente a `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- servidor: secret/service role key apenas como `SUPABASE_SERVICE_ROLE_KEY`.

Nao coloque service role, token de acesso pessoal, secret do CAPTCHA ou senha do banco em arquivos versionados.
