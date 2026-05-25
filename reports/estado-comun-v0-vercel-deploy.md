# Estado COMUN v0 - Vercel Deploy

Data: 2026-05-25

## Resumo

O projeto foi linkado e publicado na Vercel em producao.

URL publica:

- `https://comunvrabandonada.vercel.app`

O deploy esta `Ready`, os smokes principais passaram contra o dominio publicado, e nao houve vazamento publico nos checks HTTP. A validacao do fluxo completo no dominio publicado ficou parcialmente automatizada: acesso publico, gate de admin, nao vazamento e auditoria via banco foram confirmados, mas a automacao do browser nesta sessao nao conseguiu concluir digitacao no formulario/login remoto por limitacao do runtime de clipboard.

## Status do GitHub

- Remote `origin` aponta para `https://github.com/alexandrevrabandonada-oss/comunvrabandonada.git`.
- Branch de trabalho local: `codex/comun-admin-auth-remote`.
- Havia alteracoes locais deste tijolo antes do fechamento final; nenhuma indicacao de segredo versionado foi encontrada.

## Status do Deploy Vercel

- Projeto linkado: `alexandrevrabandonada-oss-projects/comunvrabandonada`
- Deployment inspecionado: `dpl_9pGVWp6wjSvZXKUQJfP4gdHkh7xq`
- Target: `production`
- Status: `Ready`
- Alias publico ativo:
  - `https://comunvrabandonada.vercel.app`

## Status das Env Vars

Produção confirmada sem expor valores:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `NEXT_PUBLIC_SITE_URL`

Observacoes:

- `NEXT_PUBLIC_SITE_URL` foi configurada para o dominio publico.
- `COMUN_ADMIN_PASSWORD` nao apareceu na listagem de envs de producao.
- `SUPABASE_SERVICE_ROLE_KEY` segue apenas como env sensivel.

## Verify e Smokes

- `npm run verify`: passou.
- `npm run smoke:comun`: passou.
- `npm run smoke:admin-auth` contra `https://comunvrabandonada.vercel.app`: passou.
- `npm run smoke:no-leak-http` contra `https://comunvrabandonada.vercel.app`: passou apos ajuste de normalizacao de whitespace no script.

## Teste no Dominio Publicado

Status: parcialmente validado por browser + HTTP + banco.

Validado no dominio publicado:

- `/comun` abre.
- `/comun/relatar` abre sem login.
- `/comun/admin` exige login.
- a pagina publica da pauta publicada nao vaza `raw_text`, `private_contact` nem `internal_notes`.
- o texto sanitizado publicado aparece na pauta publica.

Limitacao encontrada:

- a automacao do browser desta sessao nao conseguiu digitar no formulario/login do dominio publicado por erro do runtime de clipboard do browser embutido.
- por isso, o fluxo `enviar relato no dominio -> login no dominio -> publicar no dominio` nao foi concluido integralmente via UI automatizada nesta sessao.

Mitigacao usada:

- o deploy em producao foi validado por smoke HTTP e consultas ao banco.
- o fluxo completo de login, logout, revisao, publicacao e auditoria ja havia sido validado localmente no relatorio anterior.

## Teste Mobile

Status: validacao responsiva parcial concluida; teste fisico fora deste ambiente pendente.

Concluido:

- viewport mobile simulada em `390x844` no dominio publicado.
- `/comun` renderizou com CTA `Relatar` e botao `Enviar relato agora` visiveis.
- `/comun/admin/login` renderizou corretamente em viewport mobile.

Pendente fora deste ambiente:

- teste em celular real por 4G/5G;
- abertura por WhatsApp;
- abertura por Instagram.

## Confirmacao de Nao Vazamento

Status: confirmada.

Checks HTTP no dominio publicado:

- texto sanitizado esperado encontrado na pauta publica;
- marcadores sensiveis ficticios nao encontrados;
- contato privado ficticio nao encontrado;
- nota interna nao encontrada.

## Auditoria

Status: confirmada.

Ja validada localmente com eventos reais:

- `admin_login_success`
- `report_review_opened`
- `report_sanitized_saved`
- `report_published`
- `admin_logout`

No dominio publicado, o gate de admin e o banco foram confirmados; a repeticao completa do fluxo UI no proprio dominio ficou bloqueada pela limitacao de digitacao do browser automatizado.

## Busca por Segredos em Arquivos Versionados

Status: sem achados de valores reais nos arquivos versionados pesquisados.

Observacao:

- a busca local encontrou apenas referencias documentais a nomes de variaveis/segredos, sem valores reais persistidos no repositorio.

## Pendencias de Credenciais

Checklist pronto em:

- `docs/rotacao-credenciais.md`

Rotacao ainda pendente de execucao explicita:

1. access token do Supabase CLI;
2. `SUPABASE_SERVICE_ROLE_KEY`;
3. senha do banco;
4. atualizacao de `.env.local` e Vercel;
5. redeploy e rerun dos smokes.

## Arquivos Alterados Neste Fechamento

- `.gitignore`
- `app/actions.ts`
- `docs/deploy-checklist.md`
- `docs/vercel.md`
- `docs/rotacao-credenciais.md`
- `package.json`
- `scripts/smoke-comun-no-leak-http.mjs`
- `reports/estado-comun-v0-teste-manual-admin.md`
- `reports/estado-comun-v0-vercel-deploy.md`

## Proximo Tijolo Recomendado

1. Executar rotacao imediata das credenciais sensiveis compartilhadas durante a manutencao.
2. Repetir no celular real o fluxo publicado:
   - abrir `/comun`
   - abrir `/comun/relatar`
   - testar links via WhatsApp e Instagram
   - validar login admin no celular
3. Fazer uma ultima passada manual no dominio publicado com navegador comum, sem a limitacao do runtime automatizado, para registrar o fluxo UI completo em producao.
