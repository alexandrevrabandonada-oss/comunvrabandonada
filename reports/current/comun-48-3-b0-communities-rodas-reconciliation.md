# COMUN 48.3-B0 — Reconciliação de Comunidades e Rodas

**Estado:** contrato candidato; terminal condicionado ao preflight remoto e à CI

**Baseline:** `e0840fb677203e8ccd7a160edefa21d10d665e2d`

**Data da auditoria:** 2026-08-13

**Escopo:** contrato social e arquitetura; sem UI, API, flag, migration, deploy funcional ou escrita de negócio.

## Decisão executiva

O COMUN já possui os objetos necessários para uma gramática social única. Não há justificativa para criar `Community v2`, `Circle v2`, `Thread v2` ou `Feed v2`.

- `comun_communities` é a **Comunidade** canônica: vínculo social durável e opcional.
- `comun_pauta_spaces` continua sendo a **Pauta** canônica: questão coletiva durável.
- `comun_construction_circles` é a **Roda** canônica: processo estruturado pertencente a uma pauta.
- `comun_construction_circle_rounds` representa a **Rodada**: etapa ordenada da roda.
- `comun_circle_contributions` representa a participação estruturada dentro de uma rodada.
- `comun_community_work_groups` é o **Grupo de Trabalho**: núcleo operacional temporário ligado, no schema atual, a exatamente uma Comunidade e uma Pauta.
- `comun_collective_actions` continua sendo a **Ação**, objeto concreto e distinto.

O fluxo social canônico fica:

```text
Comunidade (contexto durável e opcional)
                 │
                 ├──────────────┐
                 ▼              │
Pauta ──► Roda ──► Rodada ──► Contribuições ──► Síntese
  │                                                     │
  └────────► Grupo de Trabalho ──► Ação ──► Memória ◄──┘
```

Uma pauta pode existir sem comunidade. Uma comunidade pode contextualizar várias pautas. O modelo desejado admite que mais de uma comunidade acompanhe a mesma pauta, mas o schema **ainda não sustenta essa cardinalidade**: `comun_pauta_spaces.community` é apenas um slug textual opcional. B0 registra a lacuna; não fabrica uma relação.

## Gramática social reconciliada

| Objeto | Definição canônica | Duração | Não é |
|---|---|---|---|
| Comunidade | Vínculo social durável em torno de território, tema, identidade coletiva ou propósito | persistente | pauta, roda ou feed |
| Pauta | Questão coletiva durável que se quer entender ou mudar | até virar memória, sem hard delete | comunidade, dossiê ou ação |
| Roda | Processo estruturado, com objetivo e estado, pertencente a uma pauta | delimitada pelo processo | comunidade ou thread infinita |
| Rodada | Etapa ordenada de uma roda | abre, fecha e pode ser sintetizada | a roda inteira |
| Contribuição | Participação individual dentro de uma rodada; contribuição geral legada permanece compatível fora de roda | pontual e moderável | publicação automática |
| Grupo de Trabalho | Núcleo operacional que assume trabalho concreto | temporário/cíclico | roda ou ação |
| Ação | Mobilização concreta com ciclo, participantes, resultado e memória próprios | delimitada | pauta ou grupo |

## Matriz obrigatória de reconciliação

| existing_structure | current_role | current_runtime_usage | public/private | write_path | RLS | dependencies | decision | future_role | migration_needed | risk |
|---|---|---|---|---|---|---|---|---|---|---|
| `comun_communities` | catálogo de comunidades | `/comun/comunidades`, `/comun/c/[slug]`, admin | campos institucionais de comunidades ativas são públicos | admin/server | leitura pública de ativas | pauta por slug legado, memberships, grupos | **REUSE_CANONICAL** | Comunidade canônica | não em B0 | não tratar copy hardcoded como estado canônico |
| `comun_community_memberships` | seguir/pertencer/pausar/sair | participar, Minha Participação, admin | privado; titular lê o próprio vínculo | self-service via servidor; entrada como `member` passa pelo gate atual | owner-read para authenticated; service para mutação | auth user, community | **REUSE_CANONICAL** | pertencimento comunitário | não em B0 | não conceder papel ou pauta membership por propagação |
| `comun_community_role_assignments` | responsabilidades comunitárias revogáveis | autorização/admin | privado; titular lê próprios papéis ativos | admin server-side | owner-read condicionado a membership `member` | community membership | **REUSE_CANONICAL** | governança comunitária escopada | não em B0 | `scope` textual não é autorização universal |
| `comun_pauta_spaces` | raiz de pauta | pautas públicas/admin/A1 | projeção pública filtrada; campos internos coexistem | A1/admin server-side | política pública da pauta + escrita restrita | evidência, membership, roda, ação | **REUSE_CANONICAL** | Pauta canônica | não em B0 | `community` é texto, não FK/many-to-many |
| `comun_pauta_memberships` | seguir e assumir papel em uma pauta | seguir/sair, Minha Participação | privado | gesto autenticado e reversível no servidor | tabela restrita; leitura via servidor | auth user, pauta | **REUSE_CANONICAL** | participação na pauta | não em B0 | não confundir com membership de comunidade |
| `comun_construction_circles` | processo de conversa por pauta | detalhe de pauta, hub central, admin Rodas | projeção server-side de estados ativos/concluídos | administração/facilitação server-side | client direto fechado | pauta, module, rounds | **REUSE_CANONICAL** | Roda canônica | não em B0 | helper público filtra o pai, mas não filtra filhos por status |
| `comun_construction_circle_rounds` | etapas ordenadas da roda | detalhe da pauta/admin | server-side | facilitação/admin | client direto fechado | circle; unique por posição | **REUSE_CANONICAL** | Rodada canônica | não em B0 | não expor planned/archived como rodada pública ativa |
| `comun_circle_contributions` | participações tipadas por rodada | submissão, admin, Minha Participação | `public_body` pode ser publicado; contato e moderação são privados | submissão server-side, sempre moderada | client direto fechado | circle, round aberto, evidence opcional | **REUSE_CANONICAL** | contribuição preferencial dentro de Roda | não em B0 | publicação automática e vazamento de contato são proibidos |
| `comun_pauta_contributions` | caixa geral histórica de contribuições | formulário geral, projeção aprovada, moderação | corpo aprovado pode ser projetado; contato/hashes privados | server-side | client direto fechado após hardening | pauta, safety/rate limit | **LEGACY_KEEP_COMPAT** | contribuição fora de uma roda tipada | não em B0 | dual-write/cópia para roda criaria duas verdades |
| `comun_circle_syntheses` | síntese de rodada | detalhe de pauta/admin | somente versão `published` deve ser pública | facilitação/revisão server-side | client direto fechado | circle, round | **REUSE_WITH_EXTENSION** | memória da rodada | possível em B1, se confirmada | falta constraint de uma única síntese publicada vigente por rodada |
| `comun_pauta_synthesis_versions` | histórico da síntese geral da pauta | admin/helpers | interno; pauta expõe projeção atual | server-side | service-only | pauta | **REUSE_CANONICAL** | memória da pauta | não em B0 | não substituir síntese de rodada nem absorvê-la automaticamente |
| `comun_community_work_groups` | grupo operacional Comunidade+Pauta | página comunitária/admin | active/completed públicos; composição privada | criação/composição hoje administrativas | leitura pública dos estados admitidos; members server-only | community, pauta, tasks | **REUSE_CANONICAL** | Grupo de Trabalho | não em B0 | criação valida contexto por comparação de slugs legados |
| `comun_community_work_group_members` | composição e responsabilidades do grupo | admin | privado | admin server-side | service-only | group + membership da mesma community | **REUSE_CANONICAL** | composição operacional | não em B0 | não exibir lista/responsabilidade sem contrato público |
| `comun_community_work_group_tasks` | ponte do grupo para tarefas da pauta | comunidade/admin | link público somente em grupo visível | admin server-side | leitura pública condicionada ao grupo | work group, pauta task | **DERIVED_LAYER** | execução do grupo | não em B0 | task continua pertencendo à pauta, não ao grupo exclusivamente |
| `comun_collective_actions` | mobilização concreta | ações, pauta, ciclo e memória | projeção publicada public-safe | fluxo próprio server-side | contrato próprio de ações | pauta opcional, community opcional | **REUSE_CANONICAL** | Ação distinta | não em B0 | não criar ação automaticamente a partir de grupo/síntese |
| `comun_pauta_modules` | módulos/miniapps opcionais | pauta/admin | active+public somente | admin server-side | client direto fechado | pauta | **DERIVED_LAYER** | superfície opcional | não em B0 | módulo não é Pauta, Roda ou Comunidade |
| `lib/community-experience.ts` | copy e demonstração estática de comunidades | páginas comunitárias atuais | público, mas sem autoridade de dados | commit de código | não se aplica | slugs e conteúdo manual | **DEPRECATE_CONCEPTUALLY** | compatibilidade até B1 | não | possui roda/grupos demonstrativos que podem divergir do banco |

## Cardinalidades reais

| Relação | Contrato desejado | O que existe hoje | Decisão B0 |
|---|---|---|---|
| Comunidade ↔ Pauta | N:N opcional | zero ou um slug textual em `pauta_spaces.community` | não afirmar N:N; B1 decide se precisa extensão relacional |
| Pauta → Roda | 1:N | FK obrigatória `circle.pauta_id` | suportado |
| Roda → Rodada | 1:N ordenado | FK + unique `(circle_id, position)` | suportado |
| Rodadas abertas por Roda | no máximo uma | índice parcial único `comun_circle_one_open_round` | suportado |
| Rodada → Contribuição | 1:N | guard confirma mesma roda e exige rodada aberta | suportado |
| Rodada → Síntese | versões, no máximo uma publicada vigente | 1:N sem unique de estado publicado | lacuna B1; fail closed na projeção |
| Comunidade + Pauta → Grupo | cada grupo pertence a exatamente uma de cada | duas FKs obrigatórias | suportado dentro da limitação do slug da pauta |
| Membership comunitária ↔ Grupo | N:N, mesma comunidade | tabela ponte + validação server-side | suportado |
| Pauta → Ação | 0:N | `collective_actions.pauta_id` opcional | suportado |

## Pertencimento, papéis e gates

Existem três vínculos independentes e eles devem continuar independentes:

1. **Membership de Comunidade:** acompanhar é self-service e reversível; o estado `member` passa hoje por `community_membership_review`. Esse gate protege pertencimento comunitário, não leitura pública, contribuição em roda ou acompanhamento de pauta.
2. **Membership de Pauta:** seguir/sair da pauta é autenticado e reversível. Não concede papel comunitário.
3. **Membership de Grupo:** exige membership `member` na mesma comunidade e hoje é administrado por admin/editor. Não transforma o grupo em Roda ou Ação.

Papéis de comunidade (`coordinator`, `facilitator`, `curator`, `community_editor`, `field_observer`) e papéis de pauta (`participant`, `facilitator`, `curator`, `field_observer`, `researcher`, `communication`, `coordinator`) possuem namespaces e efeitos distintos. Coincidência de label não autoriza propagação entre os dois contextos.

## Contribuição e síntese sem duas verdades

`comun_circle_contributions` é o caminho canônico **dentro de uma Roda**, porque fixa `circle_id`, `round_id`, tipo e estado de moderação. `comun_pauta_contributions` permanece como caixa geral legada/compatível para participação não estruturada por rodada.

B0 proíbe dual-write. Uma contribuição geral não é copiada para a Roda; se uma facilitação quiser incorporá-la futuramente, deverá existir um gesto explícito, auditável e sem duplicar o texto privado.

Também existem dois níveis legítimos de síntese:

- `comun_circle_syntheses`: síntese de uma rodada;
- `comun_pauta_synthesis_versions`: história da síntese geral da pauta.

Uma não substitui nem atualiza a outra automaticamente.

## Superfície pública e lacunas confirmadas

O acesso público a rodas ocorre por projeções server-side, pois as tabelas de círculo, rodada, contribuição e síntese não possuem grant direto para `anon` ou `authenticated`. Isso é correto e deve ser preservado.

Duas correções ficam para B1, sem alteração de produto em B0:

1. `listPublicCircleSurface()` seleciona círculos em estados públicos, mas traz rounds e sínteses filhos sem filtro explícito de status. A projeção B1 deve allowlistar estados de filhos e campos, evitando rascunhos, review, superseded ou archived.
2. `community-experience.ts` mantém grupos e uma roda demonstrativos hardcoded. As páginas devem migrar para DTO canônico; até lá o arquivo é compatibilidade narrativa, nunca fonte de verdade.

## Contrato executável

`lib/comun-social-architecture.ts` registra a gramática, a matriz de decisão, as cardinalidades reais e os limites de propagação. Seus testes provam:

- Comunidade, Pauta, Roda, Rodada, Grupo e Ação são objetos distintos;
- não existe estrutura `v2`;
- a relação N:N Comunidade–Pauta e uma síntese publicada vigente não são fingidas;
- membership, conteúdo, síntese e publicação não se propagam automaticamente;
- contribuições gerais ficam em compatibilidade e as contribuições de roda são canônicas dentro da rodada;
- a narrativa hardcoded não é canônica.

Decisão materializada:

```json
{
  "community": "reuse_existing_as_optional_context",
  "pauta": "reuse_pauta_spaces_as_canonical_issue",
  "roda": "reuse_construction_circles_as_structured_process",
  "round": "reuse_circle_rounds_as_process_stages",
  "contributions": "circle_contributions_canonical_inside_roda",
  "generalContributions": "legacy_keep_compatible_outside_roda",
  "syntheses": "keep_round_and_pauta_syntheses_distinct",
  "workGroups": "reuse_as_operational_nucleus",
  "actions": "reuse_as_distinct_action_object",
  "communityPautaLink": "needs_explicit_relation_before_many_to_many",
  "publicCircleProjection": "needs_child_status_filtering",
  "nextSlice": "48.3-B1"
}
```

## Auditoria remota metadata-only

O workflow `COMUN 48.3-B0 remote read-only social preflight` audita 17 tabelas sociais em `BEGIN READ ONLY` e não executa `SELECT` de conteúdo ou contagens. Ele verifica apenas:

- presença de tabelas, constraints, índices, policies e grants;
- RLS habilitado;
- owner-read de memberships e papéis comunitários;
- grupos públicos read-only;
- círculos, contribuições e sínteses fechados ao cliente direto;
- índice de no máximo uma rodada aberta;
- guards de contribuição e síntese vinculadas à rodada correta;
- plano remoto de migrations vazio, reconciliando a exceção externa de Calçadas.

Resultado esperado na PR:

`COMUN_48_3_B0_REMOTE_SOCIAL_METADATA_GREEN`

`COMUN_48_3_B0_REMOTE_PLAN_EMPTY_GREEN`

Nenhum conteúdo social, identidade, contribuição, contato, relato, localização, anexo, Wallet ou forwarding é lido.

## Próxima fatia recomendada

**48.3-B1 — Experiência canônica de Roda**, com escopo estreito:

- DTO público fail-closed de roda/rodadas/sínteses;
- substituição gradual da narrativa hardcoded por dados canônicos;
- projeção filha por status;
- decisão explícita sobre a relação N:N Comunidade–Pauta e unicidade da síntese publicada;
- participação de baixo risco sem transportar o gate editorial de dossiê.

B1 só deverá criar migration se essas duas lacunas forem comprovadamente necessárias. B0 cria zero schema.

## Invariantes preservados

- Relata privado nunca vira conteúdo social automaticamente.
- Nenhuma contribution publica automaticamente.
- Nenhum membership concede outro membership ou papel por propagação.
- Dossiê editorial, Pauta, Roda, Grupo e Ação permanecem objetos separados.
- Nenhuma tabela, UI, API, route ou feature flag nova.
- Nenhuma escrita em Production e nenhum deploy funcional.
- `COMUN_PAUTAS_VIVAS_CORE_ENABLED=enabled` permanece inalterada.
- piloto Motorola permanece pausado e `launch_publicly=false`.

## Terminal

Após preflight remoto, plano vazio e CI verdes:

`COMUN_48_3_B0_COMMUNITIES_RODAS_RECONCILIATION_CONTRACT_GREEN`
