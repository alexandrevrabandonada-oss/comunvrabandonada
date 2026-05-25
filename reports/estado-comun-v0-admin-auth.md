# Estado COMUN v0 - Admin Auth

Data: 2026-05-20

## Resumo

O admin deixou de usar senha simples por cookie proprio e passou a usar Supabase Auth com cookies SSR, protecao server-side e allowlist em `comun_admin_users`.

O fluxo publico de envio de relatos foi preservado: `/comun`, paginas publicas e `/comun/relatar` continuam sem login.

## Antes

- `/comun/admin` renderizava o formulario de senha na propria pagina.
- A sessao era um cookie `comun_admin_session` derivado de `COMUN_ADMIN_PASSWORD`.
- Nao havia allowlist de usuarios nem auditoria operacional.

## Agora

- `/comun/admin/login` autentica por e-mail/senha via Supabase Auth.
- `middleware.ts` protege `/comun/admin` e subrotas e redireciona nao autenticados para login.
- `requireComunAdmin()` exige usuario autenticado e registro ativo em `comun_admin_users`.
- `AdminShell` mostra e-mail do admin, botao sair e aviso de area interna.
- `/comun/admin/auditoria` mostra eventos administrativos para role `admin`.

## Migrations

- `supabase/migrations/202605200001_admin_auth.sql`
  - cria `comun_admin_users`
  - cria `comun_admin_audit_log`
  - ativa RLS nas duas tabelas
  - fecha leitura publica por policy
  - adiciona trigger de `updated_at` em admins

## Rotas Criadas ou Alteradas

- Criada: `/comun/admin/login`
- Criada: `/comun/admin/auditoria`
- Alteradas: `/comun/admin`, `/comun/admin/relatos`, `/comun/admin/relatos/[id]`, `/comun/admin/pautas`
- Preservadas publicas: `/comun`, `/comun/relatar`, comunidades, pautas e dossies publicos

## Env Vars

Novas/opcionais:

- `COMUN_BOOTSTRAP_ADMIN_EMAIL`: usada apenas por `npm run bootstrap:admin`.

Mantidas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`

Deprecated:

- `COMUN_ADMIN_PASSWORD`: nao e mais usada no fluxo principal admin.

## Primeiro Admin

1. Criar usuario no Supabase Auth.
2. Rodar:

```bash
npm run bootstrap:admin -- --email email@exemplo.com
```

O script usa `SUPABASE_SERVICE_ROLE_KEY`, busca o usuario Auth pelo e-mail e faz upsert em `comun_admin_users` com `role=admin` e `is_active=true`.

## Login e Logout

- Login: Supabase Auth por `signInWithPassword`.
- Acesso: exige sessao valida e allowlist ativa.
- Logout: `signOut()` no Supabase e redirect para `/comun/admin/login`.
- Eventos auditados: `admin_login_success` e `admin_logout`.

## Protecao das Rotas Admin

- Middleware protege `/comun/admin` e `/comun/admin/*`.
- Server Components e server actions usam `requireComunAdmin()`.
- Operacoes sensiveis continuam usando service role apenas no servidor.

## Auditoria

Tabela interna: `comun_admin_audit_log`.

Eventos implementados:

- `admin_login_success`
- `admin_logout`
- `report_review_opened`
- `report_sanitized_saved`
- `report_published`
- `report_unpublished`
- `report_archived`

Metadata e sanitizada para nao gravar `raw_text`, `private_contact`, `internal_notes`, senhas ou tokens.

Eventos previstos para proximos tijolos, quando houver edicao dessas entidades:

- `issue_updated`
- `dossier_updated`

## Scripts

- `npm run bootstrap:admin`
- `npm run smoke:admin-auth`

O smoke de admin-auth verifica envs, tabelas de admin/auditoria, existencia de admin ativo quando possivel, acesso publico e redirect do admin quando `NEXT_PUBLIC_SITE_URL` esta configurado.

## Status dos Testes

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `npm run smoke:comun`: falhou no ambiente atual por DNS `ENOTFOUND` ao host Supabase configurado; a falha ocorreu antes de validar regras de negocio.
- `npm run smoke:admin-auth`: falhou pelo mesmo problema de conectividade Supabase (`fetch failed`/DNS), antes de validar schema remoto.
- Teste HTTP local do build:
  - `/comun/relatar`: 200 sem login.
  - `/comun/admin`: 307 sem login.

## Riscos Restantes

- Aplicar a migration nova no Supabase remoto antes de usar o admin.
- Criar o usuario Auth e rodar bootstrap do primeiro admin.
- Reexecutar `npm run smoke:comun` e `npm run smoke:admin-auth` em ambiente com DNS/acesso ao Supabase.
- `report_review_opened` registra um evento a cada abertura da pagina de revisao; se gerar volume excessivo, reduzir em tijolo posterior.
- `issue_updated` e `dossier_updated` ainda nao tem actions de edicao neste v0.

## Proximos Tijolos Recomendados

1. Aplicar migrations no Supabase e validar login real em ambiente remoto.
2. Criar roles efetivas por permissao fina (`admin`, `editor`, `viewer`) nas actions.
3. Adicionar filtros/paginacao na auditoria.
4. Criar actions editoriais para pautas/dossies com auditoria `issue_updated` e `dossier_updated`.
