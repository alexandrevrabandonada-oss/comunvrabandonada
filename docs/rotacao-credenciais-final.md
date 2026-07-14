# Rotacao de Credenciais Final

Use este roteiro para fechar a rotacao imediata sem expor valores em chat, terminal compartilhado ou arquivos versionados.

## A. Supabase access token do CLI

1. Revogar o token antigo no painel/conta Supabase.
2. Gerar novo token.
3. Rodar novo login no CLI:

```bash
npx supabase login
```

4. Nunca salvar o token em arquivo versionado.

## B. SUPABASE_SERVICE_ROLE_KEY

1. Rotacionar/regenerar a service role key no painel Supabase, se a conta/plano permitir.
2. Atualizar `.env.local` manualmente.
3. Atualizar a env var correspondente na Vercel.
4. Fazer redeploy.
5. Rodar os smokes.

## C. Senha do banco

1. Trocar a senha do banco no Supabase.
2. Atualizar `SUPABASE_DB_PASSWORD` apenas no ambiente local/seguro, se ela for usada pelo CLI.
3. Nao colocar a senha em docs.
4. Validar `supabase db push` ou outro comando administrativo somente em ambiente seguro.

## D. Vercel

Confirmar no painel da Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`

Remover ou deixar ausente:

- `COMUN_ADMIN_PASSWORD`

Regras:

- `SUPABASE_SERVICE_ROLE_KEY` apenas como env sensivel;
- nao colocar service role no GitHub;
- `NEXT_PUBLIC_SITE_URL` deve apontar para `https://comunvrabandonada.vercel.app`;
- depois de alterar env vars, fazer redeploy.

## E. Pos-rotacao

Rodar:

```bash
npm run verify
npm run smoke:comun
npm run smoke:admin-auth
npm run smoke:no-leak-http -- --path /comun/pautas/trabalho-burnout-volta-redonda --required "<public_text>" --forbidden "<texto-sensivel>"
```

Depois:

1. Confirmar que `/comun` continua publico.
2. Confirmar que `/comun/relatar` continua publico.
3. Confirmar que `/comun/admin` continua exigindo login.
4. Confirmar que a pauta publica continua sem vazamento.
5. Limpar registros locais inseguros.
6. Nunca commitar segredos.
