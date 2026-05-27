# Estado COMUN Sprint 0

Data: 2026-05-27

## Resumo

O projeto ja esta alem da fundacao pedida para este tijolo. A rota `/comun` existe, a estrutura publica e administrativa do modulo COMUN esta criada e o projeto segue verificando com sucesso.

Neste ciclo, o trabalho foi de diagnostico. Nao foi necessario criar um placeholder novo para `/comun`, porque a rota ja esta implementada e integrada ao restante da aplicacao.

## O que foi encontrado

### Rotas existentes

Rotas principais do App Router:

- `/` redireciona para `/comun`
- `/comun`
- `/comun/comunidades`
- `/comun/c/[slug]`
- `/comun/pautas/[slug]`
- `/comun/dossies`
- `/comun/dossies/[slug]`
- `/comun/relatar`
- `/comun/relatar/confirmacao`
- `/comun/seguranca`
- `/comun/admin`
- `/comun/admin/login`
- `/comun/admin/relatos`
- `/comun/admin/relatos/[id]`
- `/comun/admin/pautas`
- `/comun/admin/auditoria`

### Layouts e componentes reutilizaveis

Base visual e estrutural encontrada:

- [app/layout.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/layout.tsx>): layout raiz com metadata global
- [app/globals.css](</C:/Projetos/COMUM VR ABANDONADA/app/globals.css>): base global com tema urbano/industrial escuro
- [components/comun-shell.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/comun-shell.tsx>): shell publico do COMUN com header, footer, `Section` e `PrimaryLink`
- [components/admin-shell.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/admin-shell.tsx>): shell interno do admin
- [components/status-label.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/status-label.tsx>): componente reutilizavel de status
- [components/admin-login-form.tsx](</C:/Projetos/COMUM VR ABANDONADA/components/admin-login-form.tsx>): formulario de login do admin

### Stack e padrao de pastas

Stack identificada:

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js` e `@supabase/ssr`)
- Zod

Pasta e convencoes:

- `app/`: rotas e server actions
- `components/`: shells e UI reutilizavel
- `lib/`: acesso a dados, auth, auditoria, seed e tipos
- `scripts/`: smokes, bootstrap e utilitarios
- `supabase/migrations/`: migrations SQL
- `docs/`: operacao, deploy e testes
- `reports/`: relatorios de estado

### Scripts disponiveis

Em [package.json](</C:/Projetos/COMUM VR ABANDONADA/package.json>):

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run verify`
- `npm run smoke:comun`
- `npm run smoke:admin-auth`
- `npm run smoke:no-leak-http`
- `npm run bootstrap:admin`
- `npm run db:types`
- `npm run db:push`
- `npm run seed`

### Seguranca de rotas

- [middleware.ts](</C:/Projetos/COMUM VR ABANDONADA/middleware.ts>) protege apenas `/comun/admin/:path*`
- o fluxo publico de `/comun` e `/comun/relatar` permanece desacoplado de login

### Tema visual

Em [tailwind.config.ts](</C:/Projetos/COMUM VR ABANDONADA/tailwind.config.ts>) e [app/globals.css](</C:/Projetos/COMUM VR ABANDONADA/app/globals.css>):

- paleta preto/asfalto/papel/amarelo
- alto contraste
- linguagem visual industrial
- foco funcional e legibilidade mobile-first

### Backup e seguranca operacional

- nao encontrei padrao explicito de backup de arquivos no repositorio
- nao foi necessario alterar arquivo sensivel neste tijolo

## Arquivos criados ou alterados

Criado:

- [reports/estado-comun-sprint-0.md](</C:/Projetos/COMUM VR ABANDONADA/reports/estado-comun-sprint-0.md>)

Nao houve outras alteracoes neste tijolo.

## Riscos

- o repositorio ja esta muito alem de uma fundacao minima; tratar este estado como “sprint 0” exige cuidado para nao simplificar diagnosticos futuros
- havia alteracoes locais preexistentes no working tree antes deste relatorio, fora do escopo deste tijolo
- o modulo depende de Supabase e de env local configurado para validacoes completas
- como nao ha padrao de backup explicito no repo, qualquer refactor estrutural futuro deve ser mais disciplinado

## Proximos tijolos recomendados

1. Consolidar um mapa funcional do COMUN por fluxo: envio, curadoria, publicacao, dossie e auditoria.
2. Revisar UX mobile real em `/comun`, `/comun/relatar` e leitura de pautas.
3. Criar documentacao de arquitetura do modulo COMUN, separando claramente camada publica, admin e integracao Supabase.
4. Estabelecer uma estrategia de testes end-to-end para o fluxo principal sem depender so de smoke scripts.
5. Definir backlog de produto do COMUN sem reintroduzir features de rede social generica.

## Resultado da verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou

Conclusao:

- o projeto continua buildando e verificando
- `/comun` existe e ja esta implementado
- o relatorio de Estado da Nacao deste tijolo foi gerado com sucesso
