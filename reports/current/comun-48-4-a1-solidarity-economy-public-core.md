# COMUN 48.4-A1 — Núcleo público de economia solidária

Data: 15/08/2026

Baseline obrigatório: `9df17371c9ff703e73d561142f6a5fa317b3e3a5`

Estado deste relatório: implementação funcional em validação; promoção remota e rollout ainda não registrados.

## Resultado funcional

A rota canônica `/comun/cooperativas` foi recomposta, sob a flag fail-closed
`COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED`, como **Feirinha — Trocas e
economia solidária**. A experiência é exclusivamente de descoberta e separa:

- ofertas públicas ativas e ainda válidas;
- necessidades públicas abertas ou parcialmente atendidas;
- organizações com gates próprios e território pai publicável.

Não há checkout, pedido, pagamento, chat, contratação, avaliação, ranking,
contagem de interesses ou publicação pública de dados econômicos.

## Decisões canônicas preservadas

- `comun_territorial_organizations` permanece a raiz de Organização;
- `comun_territorial_needs` permanece a raiz de Necessidade;
- `comun_territorial_need_interests` não participa da projeção pública;
- somente `comun_solidarity_offers` foi criado como novo objeto canônico;
- `services_public` continua copy de perfil e não gera Oferta;
- Mapa Popular permanece compatível; a Feirinha usa adapter server-only próprio;
- nenhuma raiz de produto, listing, estoque, pedido, troca, carrinho ou pagamento foi criada.

## Migration única

Arquivo: `supabase/migrations/20260815184529_comun_solidarity_offers.sql`.

A tabela vincula cada Oferta a `comun_territorial_organizations` por
`organization_territory_id`, admite somente os kinds e modalidades do contrato,
mantém preço opcional em centavos/BRL e possui ciclo
`draft → pending_review → published → paused/expired/archived`.

Uma Oferta `published` exige `reviewed_at`, `published_at`, `valid_until` e
`valid_until > published_at`. O runtime também exige `valid_until > now()`;
nenhum write automático ocorre na expiração. RLS e FORCE RLS estão ativos,
`public`, `anon` e `authenticated` não têm privilégio e somente `service_role`
recebe CRUD. Não há policy de cliente, seed ou backfill.

## Gates públicos fail-closed

Organização somente é projetada quando todos estes gates passam:

- território pai: `visibility=public`;
- território pai: `status ∈ {active, monitoring}`;
- território pai: `verification_status ∈ {source_checked, verified}`;
- organização: `status ∈ {active, forming}`;
- organização: `verification_status ∈ {source_checked, verified}`.

Strings desconhecidas não são admitidas. `public_contact_authorized` é tratado
como texto deliberadamente público; valor vazio resulta em `null` e jamais há
fallback para `private_contact`.

Necessidade organizacional só aparece se a organização também passar pelo gate.
Necessidade sem organização exige território público elegível. Campos legados
`action_id`, `task_id`, responsável e notas internas não são selecionados.

## Runtime e DTO

O adapter realiza uma leitura batched com quatro consultas paralelas e bounded,
sem `SELECT *` e sem N+1. A saída usa DTOs explícitos de Organização, Oferta,
Necessidade e Diretório. Qualquer erro de fonte produz estado indisponível, sem
usar dado stale ou relaxar gates.

A flag OFF preserva a experiência anterior da rota. A flag ON ativa a Feirinha.
A Home não recebe uma quinta porta e nenhuma API nova foi criada.

## Privacidade e escopo deferido

- `COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE`;
- `COMUN_48_4_A1_PUBLIC_ECONOMIC_WRITES_DEFERRED_UNTIL_IDENTITY_CLAIM_CONTRACT`;
- `exchange=DEFERRED_UNTIL_EXPLICIT_CONSENT_FLOW`;
- `payments=DEFERRED`;
- `orders=DEFERRED`;
- `ratings=FORBIDDEN_FIRST_CYCLE`.

Não há leitura de Relata, Wallet, conta, localização privada, anexos, contatos
privados ou interesses. `launch_publicly=false` permanece preservado.

## Validação local registrada

- testes focais: 19 verdes;
- suíte unitária completa: 191 arquivos e 996 testes verdes;
- typecheck global: verde;
- lint global: verde;
- build de produção: verde, com `/comun/cooperativas` dinâmica;
- migration delta esperado: exatamente um arquivo A1;
- preflight remoto, descartável, PR, merge e Production: pendentes de registro neste ponto.

O terminal green somente poderá ser emitido depois dos gates remotos e do
rollout exact-main com `businessWrites=0`.
