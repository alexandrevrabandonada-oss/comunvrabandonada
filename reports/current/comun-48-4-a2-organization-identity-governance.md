# COMUN 48.4-A2 — Identidade e governança das organizações

Data: 15/08/2026

Baseline obrigatório: `443c560117622dc3e0509a767cefbf4c5e4c54cd`

Estado deste relatório: implementação candidata; promoção e evidência de Production serão registradas após merge exact-head.

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

O Supabase local não pôde iniciar porque o Docker Desktop não está disponível no runner Windows. O workflow descartável versionado executará o SQL real na CI: primeiro vínculo, idempotência, aprovação da plataforma, editor, bloqueio de governança por editor, revogação, promoção, bloqueio entre facilitadores, saída do último facilitador, retorno à plataforma, sentinelas privadas e zero propagação. O preflight remoto permanece `BEGIN READ ONLY`, sem leitura de conteúdo de negócio.

## Estado terminal

O terminal final só será emitido depois de PR, CI, merge exact-head, promoção e Production verde:

`COMUN_48_4_A2_ORGANIZATION_IDENTITY_GOVERNANCE_GREEN_REVOCABLE_ACCESS_NO_OWNER`

`launch_publicly=false` permanece preservado.
