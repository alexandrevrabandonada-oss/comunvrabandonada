# Estado COMUN v0 - Admin Auth Remoto

Data: 2026-05-25

## Resumo

A migration de admin auth foi aplicada no Supabase remoto. As tabelas `comun_admin_users` e `comun_admin_audit_log` foram confirmadas pelo smoke. O fluxo publico de relato tambem foi validado contra o Supabase remoto e continua sem vazar dados privados.

O primeiro admin foi criado por convite administrativo no Supabase Auth e cadastrado na allowlist `comun_admin_users`.

## Diagnostico

- `.env.local` existe.
- `SUPABASE_PROJECT_ID` esta presente.
- `SUPABASE_SERVICE_ROLE_KEY` esta presente.
- `NEXT_PUBLIC_SUPABASE_URL` esta presente.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` esta presente.
- `NEXT_PUBLIC_SUPABASE_URL` aponta para o host do mesmo `SUPABASE_PROJECT_ID`.
- `supabase` global nao esta instalado, mas `npx supabase --version` funcionou com versao `2.101.0`.
- O CLI autenticou sem imprimir token.
- O projeto estava pausado no inicio, mas depois aceitou link e migration.

## Migration Remota

Migration aplicada:

- `supabase/migrations/202605200001_admin_auth.sql`

Comandos executados:

```bash
npx supabase link --project-ref nvmdszymrtacfehdynpg
npx supabase db push --linked
```

Status: aplicada no remoto.

O `db push` aplicou a migration `202605200001_admin_auth.sql`. Os notices sobre trigger/policies inexistentes eram esperados por causa do SQL idempotente.

## Status das Tabelas Remotas

- `comun_admin_users`: confirmada pelo `npm run smoke:admin-auth`.
- `comun_admin_audit_log`: confirmada pelo `npm run smoke:admin-auth`.

## Primeiro Admin

Status: criado e ativo na allowlist.

Tentativa executada:

```bash
npm run bootstrap:admin -- --email alexandrecampos@id.uff.br
```

Resultado inicial:

- O usuario Auth `alexandrecampos@id.uff.br` nao foi encontrado.
- O script retornou erro claro pedindo para criar o usuario no Supabase Auth primeiro.

Acao executada depois:

- Usuario Auth convidado/criado por API admin, sem definir nem imprimir senha.
- Bootstrap executado novamente com sucesso.

Resultado final:

- `alexandrecampos@id.uff.br` cadastrado em `comun_admin_users`.
- `role=admin`.
- `is_active=true`.

Proximo passo:

1. O admin precisa aceitar o convite ou configurar senha pelo fluxo do Supabase Auth.
2. Depois disso, fazer login em `/comun/admin/login`.

## Login e Logout

Status remoto: admin ativo validado; login real ainda depende de aceitar convite/configurar senha.

Validado sem login:

- Com o app local em `http://localhost:3100`, `npm run smoke:admin-auth` confirmou que `/comun/admin` exige autenticacao.
- `/comun/admin/login` existe no build.

Pendente:

- login real com Supabase Auth;
- e-mail do admin no `AdminShell`;
- acesso a `/comun/admin/auditoria`;
- logout real e retorno para login.

## Rotas Publicas

Validado localmente:

- `/comun`: acessivel sem login.
- `/comun/relatar`: acessivel sem login.
- `/comun/admin`: exige autenticacao.

O smoke de admin-auth foi executado com `NEXT_PUBLIC_SITE_URL=http://localhost:3100`, porque a porta 3000 estava ocupada por outro processo retornando 404.

## Fluxo Relato Publico -> Admin -> Publicacao Sanitizada

Status: validado por `npm run smoke:comun`.

O smoke:

- inseriu relato pela chave publica;
- confirmou o relato interno via service role;
- publicou `public_text` sanitizado;
- consultou `comun_public_reports`;
- confirmou que a view publica nao expoe `raw_text`, `private_contact` nem `internal_notes`;
- removeu o relato de teste.

## Auditoria

Status: tabela confirmada; eventos reais pendentes de login com senha configurada.

Eventos esperados apos bootstrap e login:

- `admin_login_success`
- `report_review_opened`
- `report_sanitized_saved`
- `report_published`
- `admin_logout`

O helper de auditoria sanitiza metadata e nao grava:

- `raw_text`
- `private_contact`
- `internal_notes`
- senha
- token
- service role

## Vercel Env

Devem existir na Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`

Opcional/local:

- `COMUN_BOOTSTRAP_ADMIN_EMAIL`

Deprecated:

- `COMUN_ADMIN_PASSWORD`

Orientacao:

- Remover `COMUN_ADMIN_PASSWORD` da Vercel se nao houver outro uso fora deste app.
- Manter `SUPABASE_SERVICE_ROLE_KEY` apenas como variavel sensivel.
- Fazer redeploy apos alterar env vars.

## Testes

- `npm run verify`: passou.
- `npm run smoke:comun`: passou.
- `npm run smoke:admin-auth`: passou nos checks; em execucao isolada, `smoke_exit=0`.

Detalhe do smoke admin-auth:

- `comun_admin_users`: ok.
- `comun_admin_audit_log`: ok.
- admin ativo: ok.
- `/comun`: ok sem login.
- `/comun/relatar`: ok sem login.
- `/comun/admin`: ok, exige autenticacao.

## Problemas Encontrados

- O projeto Supabase estava pausado no inicio da operacao.
- A porta local 3000 estava ocupada por outro processo retornando 404; o smoke HTTP foi repetido contra app local em 3100.
- O usuario Auth `alexandrecampos@id.uff.br` precisou ser criado por convite administrativo.
- Login manual ainda depende de aceite do convite ou definicao de senha pelo Supabase Auth.
- Credenciais sensiveis foram recebidas nesta conversa para uso operacional; recomenda-se rotacionar access token, service role e senha do banco apos concluir a manutencao.

## Criterios de Pronto

- Migration aplicada no remoto: concluido.
- Pelo menos um admin ativo: concluido.
- `/comun/admin` redireciona/exige login: validado.
- Login Supabase Auth: pendente de aceite/configuracao de senha.
- Logout: pendente de teste manual apos login.
- `/comun/relatar` publico: validado.
- Relato publico salva no remoto: validado.
- Admin revisa e publica: pendente de teste manual apos login.
- Pagina publica sem vazamento: validado por smoke.
- Auditoria registra acoes: pendente de teste manual apos login.
- `npm run verify`: passou.
- `npm run smoke:comun`: passou.
- `npm run smoke:admin-auth`: passou.

## Proximos Tijolos Recomendados

1. Aceitar o convite/configurar senha do usuario `alexandrecampos@id.uff.br`.
2. Fazer teste manual completo de login, logout, publicacao sanitizada e auditoria.
3. Rotacionar as credenciais sensiveis compartilhadas nesta conversa.
