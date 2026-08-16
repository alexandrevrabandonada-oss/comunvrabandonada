# COMUN 48.4-A3 — Conteúdo econômico autorizado das organizações

Data da implementação: 16/08/2026

Baseline: `7669f8157826cb2cb63affd6e70b3bae856f3dc5`

Estado: promovido em Production, com schema cloaked antes da ativação e smoke final read-only verde.

## Resultado

A3 resolve `COMUN_48_4_A2_ECONOMIC_CONTENT_WRITES_DEFERRED_TO_A3` com uma fronteira explícita: a organização é o ator econômico; pessoas com acesso A2 `active` e papel `editor` ou `facilitator` recebem somente autoridade revogável para manter Ofertas e Necessidades daquela organização. Não existem `owner`, `seller`, produto, pedido, pagamento, checkout, inventário ou marketplace.

## Schema e transação

- uma migration forward-only: `20260816011500_comun_solidarity_economic_content_writes.sql`;
- nenhuma nova raiz econômica: Oferta continua em `public.comun_solidarity_offers` e Necessidade em `public.comun_territorial_needs`;
- única estrutura nova: `private.comun_solidarity_economic_content_events`, ledger operacional sem título, resumo ou autoria pública;
- RLS e FORCE RLS ativos; `public`, `anon` e `authenticated` sem grants; tabela e quatro RPCs acessíveis somente por `service_role`;
- `request_id` UUID único e advisory lock tornam cada create/transição idempotente no banco;
- rate limits usam somente identidade privada já autenticada: 20 creates/24h e 100 edições/transições/h; nenhum IP bruto é persistido;
- todas as RPCs são `SECURITY DEFINER`, fixam `search_path=pg_catalog`, usam relações qualificadas e revalidam acesso A2, gates A1 e pertencimento do conteúdo à organização;
- migration SHA-256: `219aa75e024bdbcf1d0740aac54f607f9b9d2cfcffbeaaf99ad166aede5fb0f0`.

## Gates preservados

Cada write exige, novamente no banco:

- acesso `state=active` e `role IN ('editor','facilitator')`;
- organização `status IN ('active','forming')` e `verification_status IN ('source_checked','verified')`;
- território pai `visibility=public`, `status IN ('active','monitoring')` e `verification_status IN ('source_checked','verified')`.

Um acesso `pending`, `revoked` ou `left`, uma organização inelegível ou um ID de outra organização falham fechados. Um write não cria membership de Comunidade/Pauta, participação em Ação ou Grupo de Trabalho.

## Ofertas

O primeiro save pede título, resumo público e modalidade. `offer_kind` usa `other` quando não refinado; preço é opcional e nunca vira `R$ 0`; publicação recebe validade padrão de 30 dias, limitada a 1–180 dias. Conteúdo normal e seguro segue `validar → salvar → publicar`, sem fila humana universal. `reviewed_at` representa passagem pelo gate determinístico A3, não endosso do COMUN.

O ciclo suporta edição coletiva, pausa, retomada, renovação da mesma Oferta e arquivo sem hard delete. Oferta vencida ou ligada a organização que deixou de ser elegível continua escondida pelo adapter fail-closed A1.

## Necessidades

O primeiro save pede título e resumo. `need_type` usa `other` quando não refinado e `due_at` é opcional. A criação fixa server-side a organização e seu território, `visibility=public`, `status=open` e deixa `project_id`, `pauta_id`, `action_id`, `task_id`, `responsible_internal` e `internal_notes` nulos. Não há write em `comun_mobilization_actions`.

O ciclo humano admite `open → partially_met → met`, cancelamento e reabertura explícita de `met/cancelled → open`, sempre auditada e sem hard delete.

## Segurança e privacidade

Os Server Actions reutilizam o guard determinístico existente para PII/alto risco, adicionam honeypot e o banco repete o bloqueio de e-mail, telefone, CPF, token/URL privada e categorias econômicas claramente restritas. Não há IA ou serviço externo. O conteúdo não pode substituir `public_contact_authorized`; `private_contact` nunca é selecionado como fallback.

Os DTOs públicos A1 continuam sem `actor`, `access`, `request_id` ou audit. A autoria privada existe somente para autorização, rate limit e trilha operacional.

## Experiência

As rotas ficam no contexto canônico da organização:

- `/comun/cooperativas/[slug]/ofertas/nova`;
- `/comun/cooperativas/[slug]/ofertas/[offerSlug]/editar`;
- `/comun/cooperativas/[slug]/necessidades/nova`;
- `/comun/cooperativas/[slug]/necessidades/[needSlug]/editar`.

Não há seller dashboard nem nova raiz. Somente acesso ativo vê “Oferecer algo”, “Registrar uma necessidade” e controles de manutenção. Draft de formulário permanece em `sessionStorage`; sessão expirada produz `returnTo` para o mesmo contexto e nunca autoenvia após login.

Feature flag: `COMUN_SOLIDARITY_ECONOMIC_CONTENT_WRITES_ENABLED`, fail-closed e efetiva apenas quando A1 e A2 também estão enabled.

## Gates de promoção

- preflight remoto A3: metadata-only em `BEGIN READ ONLY`, `businessContentRead=false`, plano 0/1 migration conforme estado remoto;
- descartável A3: editor/facilitator, idempotência, wrong-organization, pending, Oferta e Need completos, RLS/grants e rollback total;
- Activation: exact-main, ancestry, migration e SHA fixados; Wave 0 promove schema com A3 disabled; Wave 1 habilita somente A3;
- rollout Production usa apenas GET/HEAD e `businessWrites=0`; nenhuma fixture Production.

O Docker Desktop não estava disponível no Windows local. A prova SQL real fica obrigatória no workflow descartável Supabase antes do merge.

## Fechamento de promoção

- PR funcional: `#334`;
- head funcional exato: `7e6a346acd133a18ec7b8ee58733cf2085b86bac`;
- merge squash/main: `f63957fd7016b962b9aea1b567a482f2a0398618`, sem alteração do conteúdo aprovado do head funcional;
- preflight remoto A3 `31956271757` e prova descartável Supabase A3 `31956271710` verdes;
- CI aplicável, segurança, jornadas, superfícies, coerência, inteligência e qualidade/performance verdes no head funcional e novamente no `main` pós-merge;
- Wave 0 `31958532076`: migration exata promovida, postflight metadata-only verde, A3 `disabled`, GET/HEAD smoke verde e `businessWrites=0`;
- Wave 1 `31958676222`: somente A3 `enabled`, Production no exact-main, GET/HEAD `200` em `/comun`, `/comun/participar`, `/comun/cooperativas` e `/comun/minha-participacao`, `HEAD /comun/cooperativas=200` e `businessWrites=0`;
- a Feirinha permaneceu sem fixture Production, com empty states reais; nenhum conteúdo econômico foi criado durante o rollout;
- os preflights históricos de slices anteriores que bloqueiam qualquer migration nova foram classificados como não aplicáveis ao A3; os gates específicos A3 provaram a única migration intencional.

Estado terminal:

`COMUN_48_4_A3_AUTHORIZED_ECONOMIC_CONTENT_WRITES_GREEN_OFFERS_NEEDS_NO_SELLER`

## Preservados e deferidos

- `COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED`;
- `COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE`;
- pedidos, pagamentos, ratings, exchange transacional e cadastro público de organização continuam fora do A3;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` e `launch_publicly=false` permanecem.
