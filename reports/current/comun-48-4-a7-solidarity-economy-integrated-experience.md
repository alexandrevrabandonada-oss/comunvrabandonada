# COMUN 48.4-A7 — Fechamento da experiência de economia solidária

Data: 17/08/2026
Baseline: `a7bfce43e73ee751ebb9a69b2bd5eb861c2aade4`

## Decisão

`48.4_FIRST_CYCLE_CLOSED`.

O primeiro ciclo da economia solidária fecha com uma única história pública:

`Participar → Feirinha → Organização → Oferta/Necessidade → Interesse/Ajuda → conexão consentida → Minha participação`.

Para uma pessoa com acesso ativo, a continuidade privada permanece contextual:

`Minha participação → Organização → perfil/conteúdo/conexões/governança`.

Nenhuma entidade econômica, rota raiz, API REST, migration, pagamento, pedido,
chat, ranking, avaliação ou conta de vendedor foi criada.

## Auditoria A1–A6

| Capacidade | Raiz preservada | Decisão A7 |
| --- | --- | --- |
| diretório público | DTO A1 fail-closed | autoridade pública única |
| vínculo | acesso A2 revogável | organização, não propriedade individual |
| Oferta/Necessidade | writes A3 autorizados | manutenção contextual, sem seller |
| onboarding | workflow A4 privado | aprovação continua diretamente na organização |
| interesse/ajuda | conexão A5 consentida | contato segue protegido antes do aceite |
| perfil | autogestão A6 de baixo risco | identidade e verificação seguem protegidas |

## Matriz de experiência

A matriz versionada vive em
`lib/comun-solidarity-economy-experience.ts` e cobre oito grupos de rota. Para
cada um registra comportamento público, autenticado sem vínculo, `pending`,
`editor`, `facilitator`, flags OFF/ON, intenção primária, ação primária e
retorno canônico.

As decisões centrais são:

- Feirinha continua dentro de **Participar**, sem quinta porta na Home;
- `/comun/cooperativas/[slug]` continua sendo o centro contextual;
- `pending` lê a ficha pública e acompanha o pedido, sem controles de edição;
- editor e facilitator têm a mesma manutenção econômica;
- somente facilitator recebe governança de acessos;
- formulários retornam à organização, sem dashboard intermediário;
- Minha participação continua sendo o retorno pessoal, sem aba econômica nova.

## Correções de coerência

- o onboarding aprovado resolve o acesso ativo pelo território aprovado e
  oferece **Continuar na organização**; se a projeção ainda não resolver o
  slug, o fallback seguro é **Ver em Minha participação**;
- os atalhos de perfil, Oferta e Necessidade foram reunidos numa área privada
  claramente rotulada, preservando os controles contextuais dos cards;
- vínculo e conexões possuem fronteira visual privada explícita;
- zero conexões possui empty state privado útil, sem sugerir ausência externa;
- empty states públicos agora dizem “publicadas no COMUN” e não inferem
  ausência de organizações, ofertas ou necessidades no mundo real;
- estados de Offer/Need usam allowlist de linguagem humana; valor interno
  desconhecido falha fechado como **Indisponível para manutenção**;
- Minha participação oferece Feirinha como continuidade quando as flags
  econômicas estão ativas e não existe participação econômica.

## Privacidade e segurança

- `private_contact`, `contact_private`, notas privadas, ator, membro, acesso,
  request id, localização privada, auditoria e snapshots continuam fora do DTO
  A1 e do HTML público;
- nenhum fallback para contato privado foi adicionado;
- nenhum write A2–A6 foi alterado;
- nenhum vínculo social, Pauta, Roda, Ação, Comunidade ou Grupo de Trabalho é
  propagado;
- A7 não lê conteúdo de negócio no preflight remoto;
- rollout executa somente GET/HEAD e registra `businessWrites=0`.

## Testes e operação

- suíte focal A7 cobre matriz de rotas e papéis, fechamento, estados humanos,
  continuidade do onboarding, empty states, fronteira público/privado e
  ausência de marketplace/propagação;
- suíte completa local: 201 arquivos e 1.077 testes verdes; `typecheck`, lint e
  build verdes;
- a suíte de coerência existente foi ampliada, não duplicada, incluindo
  390×844, 430×932, 768×1024 e 1440×900;
- a jornada focal passou nas quatro larguras, sem overflow e sem violações Axe
  sérias/críticas; o teste revelou e o patch corrigiu o contraste do estado
  degradado da Feirinha;
- QA manual confirmou Home sem quinta porta, Feirinha dentro de Participar e
  o estado degradado fail-closed com hierarquia semântica coerente;
- o preflight remoto é `BEGIN READ ONLY`, metadata-only, prova todas as raízes
  A1–A6, RLS forçado das raízes privadas e `migrationCount=0`;
- a ativação não muda flags nem schema: faz deploy exact-main e smoke das
  superfícies canônicas;
- nenhum dado sintético é criado em Production.

Os identificadores de PR, CI, merge e smoke Production são registrados no
fechamento operacional do task após a execução dos gates exact-head.

## Débitos que não bloqueiam o primeiro ciclo

- `COMUN_48_4_FIRST_CYCLE_INDIVIDUAL_PRODUCERS_DEFERRED`;
- pagamentos, pedidos e chat: `DEFERRED`;
- avaliações: `FORBIDDEN_FIRST_CYCLE`;
- Civic Search econômico: deferido; o DTO A1 continua canônico;
- mutação cotidiana de identidade/verificação: deferida para contrato próprio;
- ciclo de saída pública da organização exige futuro hardening específico, sem
  abrir mutação silenciosa em A7.

## Preservados

- A1–A6 e suas flags;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- `launch_publicly=false`.

## Estado terminal

O terminal abaixo somente é emitido após merge exact-head e Production green:

`COMUN_48_4_A7_SOLIDARITY_ECONOMY_INTEGRATED_EXPERIENCE_GREEN_FIRST_CYCLE_CLOSED`
