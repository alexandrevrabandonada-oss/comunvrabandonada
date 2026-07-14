# Estado COMUN v0 - Deploy Readiness

Data: 2026-05-07

## Resumo

O projeto esta pronto para push controlado ao GitHub e import na Vercel, sem adicionar features novas.

- `npm run verify` passou
- `npm run smoke:comun` passou
- `.gitignore` cobre envs, caches, logs, `.next/`, `node_modules/` e artefatos locais do Supabase
- nao foram encontrados valores reais de segredos em codigo, docs ou reports versionados
- documentacao de deploy e teste controlado foi criada

## Git

Status do repositorio:

- Git ja inicializado
- working tree com alteracoes locais ainda nao commitadas
- `origin` ja existe

Remote encontrado:

- `origin` aponta para um repositorio GitHub ja configurado

Observacao:

- como ja existe `origin`, nao se deve sobrescrever esse remote sem decisao explicita;
- o nome solicitado para o repo novo e `comun-vr-abandonada`, mas o remote atual usa outro nome.

## .gitignore

Protecoes confirmadas:

- `.env`
- `.env.*`
- `.next/`
- `node_modules/`
- caches locais comuns
- logs
- `.vercel/`
- `supabase/.temp/`
- `*.tsbuildinfo`

Observacao:

- `.env.local` fica coberto por `.env.*`
- `.env.example` continua liberado por excecao explicita

## Busca por segredos

Varredura feita em codigo, docs e reports versionados.

Resultado:

- nomes de variaveis e placeholders encontrados como esperado
- nenhum valor real de chave anon, service role, access token ou senha de banco encontrado nos arquivos versionados

Escopo excluido da busca:

- `.git/`
- `node_modules/`
- `.next/`
- `supabase/.temp/`

## Build e smoke

Status dos comandos:

- `npm run lint`: passou
- `npm run typecheck`: passou
- `npm run build`: passou
- `npm run verify`: passou
- `npm run smoke:comun`: passou

Observacao:

- o smoke depende de `.env.local` local e isso e esperado;
- o build de producao nao exige que segredos sejam expostos no codigo.

## Vercel config

Status:

- nao existe `vercel.json`
- nao ha motivo real para criar configuracao customizada agora
- o deploy padrao de Next.js App Router na Vercel continua sendo a configuracao recomendada

## Arquivos criados ou alterados neste tijolo

Alterados:

- `.gitignore`
- `docs/vercel.md`
- `README.md`

Criados:

- `docs/deploy-checklist.md`
- `docs/teste-real-controlado.md`
- `reports/estado-comun-v0-deploy-readiness.md`

## Push para GitHub

Se voce quiser publicar no remote atual:

```bash
git add .
git commit -m "feat: cria COMUN VR Abandonada v0"
git push
```

Se voce quiser criar um repositorio novo chamado `comun-vr-abandonada`:

```bash
git add .
git commit -m "feat: cria COMUN VR Abandonada v0"
git branch -M main
git remote remove origin
git remote add origin <URL_DO_REPOSITORIO_GITHUB>
git push -u origin main
```

Importante:

- so remova/substitua `origin` se quiser abandonar o remote atual;
- se preferir preservar o remote atual, use outro nome de remote, por exemplo `github-novo`.

Alternativa sem sobrescrever `origin`:

```bash
git add .
git commit -m "feat: cria COMUN VR Abandonada v0"
git branch -M main
git remote add github-novo <URL_DO_REPOSITORIO_GITHUB>
git push -u github-novo main
```

## Import na Vercel

Passos:

1. importar o repositorio GitHub na Vercel
2. confirmar o framework `Next.js`
3. manter build command padrao
4. configurar env vars
5. rodar deploy

Env vars necessarias:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMUN_ADMIN_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PROJECT_ID`

Regras:

- variaveis sensiveis ficam no painel da Vercel, nunca no GitHub
- `SUPABASE_SERVICE_ROLE_KEY` e `COMUN_ADMIN_PASSWORD` devem ser tratadas como sensiveis
- depois do primeiro deploy, atualizar `NEXT_PUBLIC_SITE_URL` com a URL real de producao, se necessario
- apos mudar env vars, rodar novo deploy

## Checklist de teste pos-deploy

Consulte:

- `docs/deploy-checklist.md`
- `docs/teste-real-controlado.md`

Pontos principais:

- enviar relato real de teste
- revisar e publicar uma versao sanitizada
- validar pauta publica
- conferir ausencia de `raw_text`, `private_contact` e `internal_notes`
- testar em celular via 4G/5G
- testar abertura por link vindo de Instagram/WhatsApp

## Riscos restantes

1. admin ainda usa senha simples por cookie e nao autenticacao real
2. remote Git atual pode nao ser o destino final desejado
3. qualquer ajuste posterior de env vars na Vercel exige novo deploy
4. o teste em celular e links externos ainda depende de execucao manual

## Proximo tijolo recomendado

Substituir o gate simples do admin por autenticacao real e iniciar um fluxo minimo de observabilidade operacional do deploy.
