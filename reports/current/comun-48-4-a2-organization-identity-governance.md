# COMUN 48.4-A2 — Identidade e governança das organizações

Data: 15/08/2026

Baseline obrigatório: `443c560117622dc3e0509a767cefbf4c5e4c54cd`

Estado deste relatório: **GREEN em Production**, com schema promovido, Wave 0 cloaked e Wave 1 habilitada sobre o mesmo `main` exato.

## Resultado funcional

A2 adiciona uma relação privada, explícita, auditável e revogável para uma pessoa autenticada agir **dentro do COMUN** por uma organização econômica já pública e verificada. Essa relação não é propriedade, seller account, representação legal, relação de trabalho ou prova de pertencimento no mundo real.

A experiência preserva a Feirinha de A1 e acrescenta:

- ficha pública em `/comun/cooperativas/[slug]`;
- CTA contextual “Tenho vínculo com esta organização”;
- pedido save-first com uma única pergunta e nota privada de 10–600 caracteres;
- fila administrativa para o primeiro vínculo;
- painel privado de facilitação para pedidos posteriores;
- integração em **Minha Participação → Organizações**, sem nova porta principal;
- saída, retirada, rejeição, promoção e revogação com história preservada.

## Raiz privada única

A única migration forward-only cria `private.comun_solidarity_organization_access`. Não há tabelas separadas de claim, membership, role, owner, seller, convite ou token.

Migration: `20260815223006_comun_solidarity_organization_access.sql`

SHA-256: `f78c36d0ccd23a2af99b9bb718ab3db1ed09086700bf4ff907a89214b8c7fb35`

Campos centrais:

- organização por `organization_territory_id`;
- pessoa autenticada por `member_user_id`;
- papel solicitado e papel ativo em `{facilitator, editor}`;
- estado em `{pending, active, rejected, withdrawn, revoked, left}`;
- escopo de análise em `{platform, organization}`;
- notas privadas de pedido/revisão;
- timestamps de cada etapa;
- trilha privada bounded de transições.

Um índice unique parcial admite no máximo uma relação viva (`pending` ou `active`) por pessoa e organização, preservando reaplicações históricas depois de estados terminais. Índices parciais cobrem as filas da plataforma, da organização e facilitadores ativos.

RLS e FORCE RLS ficam ativos. `public`, `anon` e `authenticated` não recebem acesso à tabela nem execução dos RPCs. Somente `service_role` possui CRUD/EXECUTE, usado exclusivamente no servidor.

## Transações e autoridade

As operações atômicas service-role-only revalidam a autoridade no banco:

1. **pedido** — valida sessão, organização e território pelos gates A1, aplica idempotência, limite de cinco pedidos pendentes, limite diário e cooldown de 24 horas;
2. **primeiro vínculo** — sem facilitador ativo, o banco determina `facilitator + platform`; a pessoa não escolhe o papel;
3. **pedidos seguintes** — com facilitador ativo, o banco determina `editor + organization`;
4. **análise** — plataforma canônica analisa somente o primeiro vínculo; facilitador ativo da mesma organização analisa pedido de editor;
5. **governança** — editor não governa; facilitador pode promover ou revogar editor, mas não revoga facilitador par;
6. **exceção da plataforma** — admin canônico pode revogar acesso ativo, inclusive facilitador;
7. **saída** — qualquer pessoa ativa pode sair; o último facilitador também pode sair; o próximo pedido volta ao escopo da plataforma;
8. **retirada** — a pessoa pode retirar seu próprio pedido pendente.

Todas as Server Actions autenticam e autorizam novamente. Não existe INSERT/UPDATE direto do browser.

## Gates públicos e privacidade

O pedido só aceita organizações que continuam publicáveis pelo contrato A1:

- organização `active` ou `forming`;
- organização `source_checked` ou `verified`;
- território pai público, `active` ou `monitoring`;
- território pai `source_checked` ou `verified`.

Organização pausada, fechada, não verificada ou com pai inelegível falha fechada. Aprovar acesso não altera `status`, `verification_status`, território, Oferta ou Necessidade.

A página pública nunca mostra nomes de participantes, UUIDs, quantidades de acessos, facilitadores ou editores. Campos privados de pedido, revisão, usuário, contato e notas não entram em DTO/HTML público. A facilitação vê somente um rótulo de perfil previamente autorizado ou “Pessoa autenticada”.

## Conteúdo econômico continua fechado

A2 concede **zero** escrita em `comun_solidarity_offers` e `comun_territorial_needs`. A tabela de Oferta permanece service-role-only e os interesses de Necessidade permanecem privados.

Débitos explícitos:

- `COMUN_48_4_A2_ECONOMIC_CONTENT_WRITES_DEFERRED_TO_A3`;
- `COMUN_48_4_A2_NEW_ORGANIZATION_ONBOARDING_DEFERRED`.

Também permanecem fora do escopo produtor individual, convites, e-mail de convite, pagamento, pedido, checkout, avaliação, ranking, chat, vínculo com Comunidade/Pauta/Ação/Grupo de Trabalho e qualquer seller dashboard.

## Feature flag e rollout

Flag fail-closed: `COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED`.

- OFF: A1 permanece exatamente ativa; a ficha A2 fica cloaked e writes A2 não operam;
- ON: ativa ficha, pedido, Minha Participação, painel privado e fila administrativa;
- a flag A1 não é alterada.

O workflow de ativação exige main exato, SHA da migration, plano remoto unitário, pós-flight metadata-only, Wave 0 com A2 OFF e Wave 1 alterando somente a flag A2. O smoke de Production usa apenas GET/HEAD e não cria pedido sintético.

## Validação local

- `npm run test:unit`: 193 arquivos e 1.008 testes verdes;
- `npm run typecheck`, `npm run lint` e `npm run build`: verdes;
- testes focais provam flag fail-closed, nota bounded, copy, fronteira server-only, uma única raiz privada e ausência de propagação;
- YAML dos três workflows analisado e script de rollout aprovado por `bash -n`;
- SHA da migration conferido contra o workflow de ativação;
- delta de schema limitado à migration A2.

O Supabase local não pôde iniciar porque o Docker Desktop não estava disponível no runner Windows. O workflow descartável executou o SQL real duas vezes na CI, inclusive no head final: primeiro vínculo, idempotência, aprovação da plataforma, editor, bloqueio de governança por editor, revogação, promoção, bloqueio entre facilitadores, saída do último facilitador, retorno à plataforma, sentinelas privadas e zero propagação. O preflight remoto permaneceu `BEGIN READ ONLY`, sem leitura de conteúdo de negócio.

## PR, CI e promoção

- PR funcional: `#332` — **48.4-A2 — Identidade e governança das organizações**;
- head funcional exato: `f40b39c3a772bf93d098d6096e1831cd088889b4`;
- merge/main exato: `c817d155b1fa7667683363857b6f30986f8b71f7`;
- preflight remoto A2 no head final: run `31915046864`, verde e metadata-only;
- disposable Supabase A2 no head final: run `31915046927`, verde;
- CI aplicável verde: unit, typecheck, lint, build, Full Surface Migration, Core Journeys, Experience Coherence, Civic Intelligence, Security Resilience e Vercel Preview;
- nenhuma review ou thread bloqueante; exatamente uma migration no delta contra o baseline.

Os preflights históricos A0/A1/48.2-A/48.3/P6C-C continuaram vermelhos porque seus contratos antigos rejeitam qualquer migration fora do próprio slice. Os logs registraram `BLOCKED_UNEXPECTED_MIGRATION`; essas falhas globais não foram mascaradas nem classificadas como green, mas não eram gates aplicáveis ao A2. Os gates A2 e as suítes compartilhadas aplicáveis ficaram verdes.

## Production

Wave 0: run `31915517971`, verde.

- confirmou o `main` exato, ancestry, hash e plano remoto unitário;
- promoveu somente `20260815223006_comun_solidarity_organization_access.sql`;
- postflight metadata-only confirmou RLS/FORCE RLS, ausência de grants de tabela/RPC para `anon` e `authenticated`, acesso exclusivo de `service_role` e índice de unicidade vivo;
- implantou `COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED=disabled` e preservou A1 ativa/cloaked para A2.

Wave 1: run `31915638733`, verde.

- habilitou somente `COMUN_SOLIDARITY_ORGANIZATION_GOVERNANCE_ENABLED=enabled` sobre o mesmo `main` exato;
- GET/HEAD responderam `200` em `/comun`, `/comun/participar` e `/comun/cooperativas`;
- Production não possuía organização econômica elegível no momento do smoke, portanto o detalhe ficou no empty state legítimo `empty_state_no_eligible_organization`, sem fixture ou relaxamento do gate;
- nenhuma string privada foi publicada, nenhum pedido sintético foi criado e `businessWrites=0` durante o rollout.

## Estado terminal

`COMUN_48_4_A2_ORGANIZATION_IDENTITY_GOVERNANCE_GREEN_REVOCABLE_ACCESS_NO_OWNER`

`launch_publicly=false` permanece preservado.
