# Estado COMUN v0 - Teste Manual Admin

Data: 2026-05-25

## Resumo

O fluxo manual com admin real foi validado localmente em build de producao nas portas `3200` e `3300`:

- login admin funcionou;
- logout funcionou;
- envio publico de relato funcionou;
- admin abriu o relato bruto internamente;
- admin salvou `public_text` sanitizado;
- admin publicou o relato;
- a pauta publica exibiu apenas `public_text`;
- nao houve vazamento de `raw_text`, `private_contact` ou `internal_notes`;
- a auditoria registrou eventos reais.

## Login Real

Status: validado.

Validacao observada:

- `/comun/admin` exigiu autenticacao para sessao sem cookie.
- login real ocorreu com usuario admin da allowlist.
- `AdminShell` exibiu `alexandrecampos@id.uff.br`.

Observacao operacional:

- para viabilizar o teste manual automatizado, o usuario admin recebeu senha temporaria apenas em sessao operacional. Nao foi gravada em arquivo versionado.

## Logout

Status: validado.

Validacao observada:

- clique em `Sair`;
- redirecionamento para `/comun/admin/login`;
- area admin voltou a exigir autenticacao.

## Envio Publico de Relato

Status: validado.

Relato de teste enviado em `/comun/relatar` com:

- tema: Trabalho e Burnout;
- `raw_text` contendo marcadores sensiveis ficticios `FICTICIO-7781` e `TUCANO-OCULTO`;
- `private_contact` ficticio `contato-privado-ficticio@exemplo.com`;
- autorizacao de publicacao sanitizada marcada.

Protocolo validado:

- `COMUN-20260525-979842`

Observacao:

- a confirmacao do envio foi validada em origem limpa (`3300`) para evitar cache antigo de chunks do navegador automatizado.

## Revisao no Admin

Status: validado.

Validacao observada:

- `raw_text` apareceu apenas no admin;
- `private_contact` apareceu apenas no admin;
- `internal_notes` foi editavel apenas no admin;
- `public_text` sanitizado foi salvo;
- o relato foi associado a `trabalho-burnout-volta-redonda`;
- publicacao concluida com status `published`.

## Publicacao Sanitizada

Status: validado.

Texto sanitizado publicado:

`Relato aponta pressao no ambiente de trabalho e possivel atraso de direitos. A pessoa preferiu nao se identificar. O caso segue em acompanhamento.`

## Pagina Publica

Status: validada.

Rota validada:

- `/comun/pautas/trabalho-burnout-volta-redonda`

Confirmacoes:

- `public_text` apareceu publicamente;
- `raw_text` nao apareceu;
- `private_contact` nao apareceu;
- `internal_notes` nao apareceu.

## Confirmacao de Nao Vazamento

Status: validada.

Checks observados:

- `FICTICIO-7781`: nao encontrado publicamente;
- `TUCANO-OCULTO`: nao encontrado publicamente;
- `contato-privado-ficticio@exemplo.com`: nao encontrado publicamente;
- `Nota interna de teste manual`: nao encontrada publicamente.

## Auditoria

Status: validada com eventos reais.

Eventos confirmados em `/comun/admin/auditoria`:

- `admin_login_success`
- `report_review_opened`
- `report_sanitized_saved`
- `report_published`
- `admin_logout`

O teste de logout retornou a tela de login, e o evento `admin_logout` foi confirmado diretamente no banco apos o encerramento da sessao.

Metadata auditada:

- nao continha `raw_text` completo;
- nao continha `private_contact`;
- nao continha `internal_notes`;
- nao continha senha, token ou service role.

## Smokes e Build

- `npm run lint`: passou via `npm run verify`.
- `npm run typecheck`: passou via `npm run verify`.
- `npm run build`: passou via `npm run verify`.
- `npm run verify`: passou.
- `npm run smoke:comun`: passou.
- `npm run smoke:admin-auth`: passou com `NEXT_PUBLIC_SITE_URL=http://localhost:3200`.
- `npm run smoke:no-leak-http`: passou com `NEXT_PUBLIC_SITE_URL=http://localhost:3300`.

## Arquivos Criados ou Alterados

Criados:

- `scripts/smoke-comun-no-leak-http.mjs`
- `docs/rotacao-credenciais.md`
- `reports/estado-comun-v0-teste-manual-admin.md`

Alterados:

- `app/actions.ts`
- `package.json`
- `docs/deploy-checklist.md`
- `docs/vercel.md`

## Pendencias para Vercel

- Garantir estas env vars no painel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `SUPABASE_PROJECT_ID`
- Remover `COMUN_ADMIN_PASSWORD` se ainda existir.
- Fazer redeploy apos qualquer ajuste de env var.
- Reexecutar:

```bash
npm run verify
npm run smoke:comun
npm run smoke:admin-auth
```

## Checklist de Rotacao de Credenciais

Referencia:

- `docs/rotacao-credenciais.md`

Checklist operacional:

1. Rotacionar access token do Supabase CLI se ele foi compartilhado.
2. Rotacionar `SUPABASE_SERVICE_ROLE_KEY` se ela foi exposta.
3. Rotacionar a senha do banco se ela foi compartilhada.
4. Atualizar `.env.local`.
5. Atualizar variaveis da Vercel.
6. Fazer novo deploy.
7. Rodar `npm run verify`, `npm run smoke:comun` e `npm run smoke:admin-auth`.
8. Confirmar funcionamento do app.
9. Limpar registros locais inseguros.
10. Nunca commitar segredos.

## Proximo Tijolo Recomendado

Fechar o ciclo de deploy na Vercel com:

1. ajuste final das env vars;
2. redeploy;
3. repeticao do teste manual no dominio publicado;
4. rotacao imediata das credenciais sensiveis compartilhadas durante a manutencao.
