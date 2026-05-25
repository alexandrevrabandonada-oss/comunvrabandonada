# Estado COMUN v0 - Supabase Smoke

Data: 2026-05-07

## Resumo

O fluxo central relato -> curadoria -> publicacao foi validado com Supabase real.

- migration inicial aplicada no projeto `nvmdszymrtacfehdynpg`;
- seeds iniciais presentes no banco sem duplicacao;
- smoke automatizado criou, publicou e removeu um relato de teste;
- admin carregou com cookie valido e exibiu relato bruto apenas na area interna;
- pagina publica exibiu apenas `public_text`;
- `raw_text`, `private_contact` e `internal_notes` nao vazaram nas paginas publicas nem na view usada pelo frontend.

## Variaveis de ambiente

Status observado localmente:

- `NEXT_PUBLIC_SUPABASE_URL`: presente em `.env.example` e `.env.local`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: presente em `.env.example` e `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY`: presente em `.env.example` e `.env.local`
- `COMUN_ADMIN_PASSWORD`: presente em `.env.example` e `.env.local`
- `NEXT_PUBLIC_SITE_URL`: presente em `.env.example` e `.env.local`
- `SUPABASE_PROJECT_ID`: presente em `.env.example` e `.env.local`

Observacao:

- nenhum valor sensivel e exibido neste relatorio;
- `.env.local` nao existia no inicio da auditoria e foi criado apenas para validacao local;
- `.gitignore` ja protege `.env`, `.env.local`, `.env.*`, `.next/`, `node_modules/`, caches e logs principais.

## Migration

Arquivo:

- `supabase/migrations/202605070001_initial_comun.sql`

Status:

- migration pronta para rodar;
- migration aplicada com `supabase db push` no projeto remoto;
- `create extension`, triggers, policies e inserts idempotentes executaram sem erro fatal;
- seeds usam `on conflict do update`, entao nao duplicam comunidades, pautas nem dossie.

Comandos validados:

```bash
supabase login
supabase link --project-ref <SUPABASE_PROJECT_ID>
supabase db push
```

Observacao operacional:

- no ambiente auditado, `supabase db push` precisou de `SUPABASE_DB_PASSWORD` definido para concluir sem erro.

## Seeds

Status remoto apos a migration:

- comunidades: 5
- pautas: 5
- dossies: 1

Conclusao:

- comunidades e pautas iniciais existem no Supabase;
- a estrategia atual de seed esta embutida na migration inicial e e idempotente.

## Fluxo de relato

Script criado:

- `scripts/smoke-comun-flow.mjs`

Script executa:

1. carrega `.env.local`;
2. valida envs obrigatorias;
3. insere relato de teste com chave publica;
4. confirma a linha na tabela `comun_reports` com service role;
5. publica uma versao sanitizada;
6. consulta `comun_public_reports`;
7. verifica ausencia de campos privados;
8. remove o relato de teste.

Resultado do smoke:

- `npm run smoke:comun`: passou

Observacao:

- o script usa insert anonimo sem `select` porque a RLS bloqueia leitura da linha recem-inserida por chave publica, o que esta correto e alinhado ao fluxo real da server action.

## View publica

View usada:

- `public.comun_public_reports`

Status:

- frontend publico continua lendo apenas a view segura para relatos publicados;
- smoke confirmou que `select *` na view publica retornou o relato publicado sem `raw_text`, `private_contact` e `internal_notes`;
- verificacao HTTP local confirmou que a pauta publica renderizou `public_text` e nao renderizou dados privados.

## Admin

Rotas revisadas:

- `/comun/admin`
- `/comun/admin/relatos/[id]`
- `/comun/admin/pautas`

Status:

- com `COMUN_ADMIN_PASSWORD` configurada, o gate do admin funciona por cookie hash;
- a listagem de relatos continua operacional e nao mostra segredos;
- a tela de detalhe mostra `raw_text`, contato privado e notas internas apenas no contexto autenticado;
- formulario de revisao permite editar `public_text`, mudar status, publicar, despublicar e arquivar;
- `/comun/admin/pautas` agora le do Supabase com fallback local em bootstrap.

Verificacao HTTP local:

- `/comun/admin`: 200 com cookie valido
- `/comun/admin/relatos/[id]`: 200 com relato bruto visivel internamente

## Publico

Paginas revisadas:

- `/comun`
- `/comun/comunidades`
- `/comun/c/[slug]`
- `/comun/pautas/[slug]`
- `/comun/dossies`
- `/comun/dossies/[slug]`

Status:

- comunidades, pautas e dossies agora tentam ler do Supabase e usam fallback seedado apenas quando necessario;
- relatos publicos continuam vindo apenas de `comun_public_reports`;
- verificacao HTTP local confirmou que a pauta publica exibiu o texto sanitizado e nao exibiu `raw_text`, `private_contact` nem `internal_notes`.

## Vercel

Arquivo revisado:

- `docs/vercel.md`

Status:

- documentacao agora inclui `SUPABASE_PROJECT_ID`;
- documentacao registra a sequencia `supabase login`, `supabase link`, `supabase db push`;
- build local passa com `.env.local` configurado;
- o projeto continua degradando de forma segura sem Supabase, via fallbacks e mensagens claras.

## Build e verify

Resultados:

- `npm run lint`: passou
- `npm run typecheck`: passou
- `npm run build`: passou
- `npm run verify`: passou
- `npm run smoke:comun`: passou

## Problemas encontrados

1. `.env.local` nao existia no inicio da auditoria.
2. varias paginas publicas e a pagina admin de pautas ainda dependiam de seed em memoria; isso foi trocado por leitura do Supabase com fallback seguro.
3. o primeiro `supabase db push` falhou sem `SUPABASE_DB_PASSWORD`; com a variavel definida, a migration aplicou normalmente.
4. o primeiro desenho do smoke tentava usar `insert(...).select(...)` com chave anonima; isso conflitou com a RLS de leitura e foi corrigido no script.

## Proximos tijolos recomendados

1. substituir o admin por autenticacao real antes de abrir o fluxo para uso mais amplo.
2. criar a edicao persistente de pautas e dossies no admin, hoje ainda focada em leitura.
3. adicionar testes automatizados de pagina/SSR para reforcar o nao-vazamento publico.
4. preparar upload de anexos com storage, validacao e sanitizacao de metadados.
