# COMUN 48.6-A3 — Acompanhamento, resposta e escalada

## Closeout do rollout controlado

O schema A3 está ativo em Production no `main` `759916f54faf287920437a10236f66ec1c8ef951`.
O postflight read-only `32915248906` confirmou a migration uma única vez,
as duas colunas opcionais, constraints, índice de idempotência, RPCs canônicos
e legados, grants de `service_role`, bloqueio de leitura para `anon` e
`authenticated`, `transactionReadOnly=true`, `businessWrites=0`,
`envWrites=0`, `externalOfficialSends=0` e `publicProjection=false`.

O promotion `32914674951` não foi repetido: ele aplicou a migration e parou
na verificação da assinatura `responseRpc`. A causa foi exclusiva do runner:
o contrato SQL usa `(text, uuid, text, text, boolean)`, mas o primeiro
verificador consultava `(text, uuid, boolean, text, text)`. A correção mínima
foi mergeada na PR #400; nenhum schema, env ou dado foi alterado pela correção.

Terminal: `COMUN_48_6_A3_FOLLOWUP_ESCALATION_GREEN_SCHEMA_ACTIVE_NO_AUTO_SEND`.

`ProductionSchemaWrites=1_migration_only`
`ProductionBusinessWrites=0`
`ProductionEnvWrites=0`
`externalOfficialSends=0`
`autoOfficialSend=false`
`legacy72hIsNotOfficialSla=true`

Data: 25/08/2026 (America/Sao_Paulo)  
Repositório: `alexandrevrabandonada-oss/comunvrabandonada`  
Parent/main: `dd0366bf7e2eb43c63afd2631a7a30f015685deb`  
Branch: `codex/48-6-a3-followup-escalation`

## Diagnóstico factual

O A1 já reutilizava `private.comun_forwarding_packages`,
`private.comun_forwarding_attempts`, `private.comun_forwarding_events`, a
Carteira de Participação e as rotas assistidas de ônibus, serviços essenciais,
saúde/educação/proteção e civic forwarding. Não foi criada uma segunda fila,
case, wallet, protocolo ou engine.

O envio declarado fica em `attempts.declared_at` com
`state=person_declared_sent`; o protocolo externo fica em
`attempts.official_protocol` e aparece mascarado na projeção. A resposta era
registrada como `state=responded`, mas `p_resolved=false` não deixava ação na
Carteira. O canal era reduzido ao tipo técnico (`web`, `phone` etc.), apesar de
os endpoints já validarem um ID do catálogo no servidor.

`due_at` permanece compatível como lembrete técnico legado. Nenhum resolver ou
copy do A3 usa essa coluna para declarar prazo oficial, atraso ou SLA. Prazos
oficiais só podem vir de uma fonte/catálogo explicitamente validado; os
catálogos atuais não fornecem um prazo utilizável para essas rotas.

## Implementação

A migration estreita
`20260825120000_comun_followup_escalation_continuity.sql` adiciona somente:

- `institutional_channel_id text null`, sem backfill, com shape limitado;
- `resolution_outcome text null`, limitado a `resolved`/`unresolved`;
- índice de idempotência que usa o ID canônico quando presente e conserva
  comportamento conservador para registros históricos sem ID;
- projeção de canal, resolução e histórico nos RPCs existentes;
- respostas não resolvidas mantêm `state=responded`, mas tornam a Carteira
  acionável com “Resposta não resolveu” / “Ver próximo passo”;
- `no_return` sensível permanece distinto de resposta recebida;
- grants continuam fechados para clientes e operacionais apenas em
  `service_role`.

As rotas essenciais, civic e sensível continuam validando o ID contra seus
catálogos server-side antes de chamar o RPC. URL arbitrária, ID desconhecido e
auto-envio continuam recusados. A lane STMU mantém seu contrato técnico
histórico e agora projeta os campos de follow-up; não recebeu um ID inventado.

O helper puro `lib/comun-denuncias-followup.ts` produz a projeção humana:
“Você ainda não enviou”, “Esperando resposta”, “Registrar protocolo do órgão”,
“Resposta recebida”, “Resolvido”, “A resposta não resolveu” e, apenas quando a
cadeia oficial e os protocolos anteriores estão presentes, o próximo passo de
escalada. A cadeia de energia permanece Light → Ouvidoria Light → ANEEL;
ANEEL nunca é primeiro passo.

## Semântica e segurança

- `prepared`/canal aberto não é `sent`;
- protocolo COMUN e protocolo do órgão continuam separados;
- resposta antiga com `resolution_outcome=null` não é inferida e pede revisão;
- `due_at` de 72 horas não é prazo legal, institucional ou indicador de atraso;
- escalada não é liberada por tempo inventado, emergência, canal degradado ou
  ausência de protocolo exigido;
- nenhum conteúdo de resposta sensível é projetado publicamente;
- sem notificações, cron, polling, mapa, agrupamento público ou auto-envio;
- sem backfill, fixture Production ou envio oficial externo.

## Prova descartável e rollout

Foi incluída a prova local
`scripts/comun-48-6-a3-disposable.sql` e o workflow restrito
`.github/workflows/comun-48-6-a3-disposable.yml`. O workflow inicia Supabase
local, rejeita variáveis/conexões remotas, executa a prova em transação que
termina em `ROLLBACK` e exige:

`COMUN_48_6_A3_DISPOSABLE_FOLLOWUP_ESCALATION_GREEN`  
`businessWritesAfterRollback=0`  
`autoOfficialSend=false`  
`legacy72hIsNotOfficialSla=true`  
`noBackfill=true`

A CLI Supabase não está instalada neste ambiente local; por isso a criação e a
execução descartável foram deixadas no workflow CI canônico, sem qualquer
conexão Production. Nenhuma migration foi aplicada remotamente nesta branch.

## Checks focados

O contrato puro cobre prepared, envio declarado, protocolo esperado, resposta
resolvida/não resolvida, legado sem resultado, cadeia de energia e exclusão de
emergência. O contrato SQL verifica colunas, constraints, RPCs, grants,
ausência de backfill e rollback lógico.

Validação local desta candidata: `npm run test:unit` — 225 arquivos / 1.272
testes verdes; `npm run typecheck` — verde; `npm run lint` — verde;
`npm run build` — verde; `git diff --check` — verde. A prova SQL não foi
executada contra uma instância local neste ambiente porque a CLI Supabase não
está instalada e o bootstrap via `npx` não respondeu; ela permanece restrita
ao workflow CI descartável, que rejeita variáveis/conexões remotas.

## Estado operacional

`singleDoor=ACTIVE`  
`multidomainAssistedForwarding=ACTIVE`  
`followupContinuity=ACTIVE`  
`institutionalChannelHistory=ACTIVE`  
`resolutionOutcome=ACTIVE`  
`escalationChains=ACTIVE`  
`unresolvedResponseRemainsActionable=true`  
`officialDeadlineTruth=ENFORCED`  
`legacy72hIsNotOfficialSla=true`  
`preparedIsNotSent=true`  
`openedIsNotSent=true`  
`automaticOfficialSend=false`  
`publicGeneralMap=false`  
`publicCollectiveGrouping=false`  
`ProductionBusinessWrites=0`  
`ProductionEnvWrites=0`  
`externalOfficialSends=0`  
`A3_cultural=ON/preserved`  
`A4=ON/preserved`  
`A5=preserved`

Terminal esperado após CI/migration rollout controlado:

`COMUN_48_6_A3_FOLLOWUP_ESCALATION_GREEN_SCHEMA_ACTIVE_NO_AUTO_SEND`

O próximo bloco 48.6-B0 não é iniciado neste tijolo.

Durante a primeira matriz remota, o preflight histórico P6C-C bloqueou a
candidate por ownership desconhecido da nova migration. O classificador foi
corrigido de forma explícita para reconhecer esta migration como `culture-a3`,
preservando `unknown => blocked`; nenhuma lane histórica foi relaxada.
