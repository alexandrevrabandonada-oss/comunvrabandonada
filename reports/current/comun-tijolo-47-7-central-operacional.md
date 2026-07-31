# Tijolo 47.7 — Central operacional unificada

## Diagnóstico

Base inicial: `00f84e6e18d6d75400a2fc84402a08d56b087f24`.

A Central anterior já possuía filas privadas, paginação server-side,
atribuições e eventos, porém:

- não vinculava projeções a domínio, versão e chave idempotente;
- não possuía contrato transversal de adaptadores;
- não distinguia os seis estados de SLA;
- não apresentava os recortes cotidianos em uma única superfície;
- ainda continha linguagem de fixture;
- não havia auditoria diária conjunta dos domínios.

Uma execução agendada do `COMUN Nightly` (`30588153487`) encerrou como
`startup_failure` sem jobs. Ela é tratada como finding de orquestração; não há
evidência de mutation ou falha de domínio nessa execução.

## Matriz canônica

| Domínio       | Fonte canônica                   | Item que exige trabalho          | Fila                       | SLA         | Papel                           | Próxima ação        | Lacuna fechada        |
| ------------- | -------------------------------- | -------------------------------- | -------------------------- | ----------- | ------------------------------- | ------------------- | --------------------- |
| comunidades   | memberships e role assignments   | entrada e revisão de papel       | entry / follow_up          | 48 h / 7 d  | coordinator / operations_admin  | abrir comunidade    | adaptador e versão    |
| contribuições | pauta contributions              | triagem e privacidade            | triage / safety            | 48 h / 24 h | contribution / privacy reviewer | abrir contribuição  | regra explícita       |
| pautas        | pauta e sínteses                 | síntese e decisão                | editorial                  | 72–96 h     | facilitator / coordinator       | abrir pauta         | gate preservado       |
| ações         | collective actions               | próxima etapa e resultado        | follow_up / factual        | 72–120 h    | coordinator / result editor     | abrir ação          | atividade ≠ resultado |
| tarefas       | collective action tasks          | vencimento                       | follow_up                  | 24 h        | coordinator                     | revisar bloqueio    | SLA                   |
| protocolos    | official protocols / forwardings | acompanhamento                   | follow_up                  | 72 h        | protocol operator               | abrir protocolo     | atraso                |
| respostas     | protocol responses               | síntese sanitizada               | factual                    | 72 h        | protocol operator               | abrir resposta      | gate humano           |
| resultados    | collective actions               | verificação                      | factual                    | 120 h       | result editor                   | verificar evidência | gate humano           |
| calçadas      | uploads, records, forwardings    | confirmação, moderação e retorno | entry / triage / follow_up | 24–120 h    | reviewers                       | abrir operação      | adaptação             |
| Acervo        | submissions e assets             | triagem e acessibilidade         | entry / publication        | 72–96 h     | archive curator                 | abrir Acervo        | adaptação             |
| Rádio         | processing e direitos            | processamento e direitos         | publication / rights       | 96–120 h    | radio / rights editor           | abrir Rádio         | adaptação             |
| Arte          | artwork e rights                 | direitos e acessibilidade        | rights / publication       | 72–120 h    | art editor                      | abrir Arte          | adaptação             |
| correções     | fonte do domínio                 | pedido de correção               | corrections                | 72 h        | operations admin                | abrir fonte         | deduplicação          |
| retiradas     | pedidos canônicos                | contenção                        | withdrawals                | 12 h        | rights reviewer                 | abrir pedido        | P1                    |
| incidentes    | admin alerts / workflows         | finding persistente              | safety / follow_up         | 4–24 h      | operations admin                | conter ou coordenar | issue única           |

## Segurança

As fontes são lidas por consultas fixas. A projeção não recebe texto privado,
contato, original, resposta integral, object key ou coordenada. `anon` e
`authenticated` continuam sem acesso às três tabelas operacionais; a RPC
permanece exclusiva de `service_role`.

## Evidência local

Evidência local do candidato:

- histórico completo aplicado em Supabase descartável, com compatibilidade
  transitória restaurada byte a byte ao final;
- migration aditiva aplicada e projeção vazia auditada;
- ensaio privado: 10 fontes sintéticas, 10 projeções, 0 duplicatas e rollback
  integral;
- 374 testes unitários verdes;
- 24 testes focais da operação e 9 contratos de workflow/reset verdes;
- smoke editorial com 26 verificações verdes;
- RLS matrix, typecheck, lint, Prettier, build e `git diff --check` verdes.

## Integração

- PR funcional: `#112`;
- merge funcional: `fdbfded1dcdc7361b9283f3d3a69df2ef696580a`;
- PR de preflight de transporte: `#113`;
- merge de transporte: `6a9f88cc692da080afed7334e774fee591cf5084`;
- PR de reconciliação do histórico: `#114`;
- merge de reconciliação: `18a2621f4d7e1f2d6d1af92e8c96e217bc90dd0a`;
- PR de escopo e segurança: `#115`;
- merge final de código: `993c5e9d00177f1bb4401856676322e2df42b7e4`;
- deployment Production `5684298978`: `success`.

O primeiro attempt de migration (`30591625569`) falhou antes da escrita porque
a release de Calçadas, aplicada por runner forward-only e aceita em ledger
próprio, não consta no histórico do Supabase CLI. O transporte foi corrigido
sem `--include-all` indiscriminado: a migration canônica de Calçadas é retirada
temporariamente somente após validação do hash, e o plano continua aceitando
exatamente a migration operacional.

## Evidência remota

- preflight final `30592993851`: 5 candidatos reais, schema `operations-v1`,
  migration desnecessária e zero escrita;
- migration aditiva `30592209385`: somente
  `20260730230044_comun_operations_unified_projection.sql`;
- sync final `30593054379`: 5 projeções reconciliadas e 859 projeções
  obsoletas encerradas, sem alterar fontes;
- rehearsal final `30593132418`: 10 cenários, 10 criações transacionais,
  duplicidade zero, transição negativa bloqueada e rollback verde;
- postflight final `30593185303`: 864 projeções históricas, 5 abertas, 1 P1,
  5 vencidas, duplicidades zero e órfãos zero;
- segurança remota: 3/3 tabelas presentes, 0 sem RLS e 0 grants perigosos para
  `anon` ou `authenticated`;
- fontes abertas: 2 uploads de Calçadas e 3 alertas de plataforma;
- Acervo, Rádio e Arte: nenhuma pendência pública atual projetada;
- artifacts: sanitizados, sem IDs de fonte, conteúdo privado ou dados pessoais;
- E2E read-only em Production: 15/15 em 360×800, 390×844, 768×1024,
  1024×768 e 1366×768; visitante redirecionado ao login, sem overflow e sem
  violação séria/crítica de acessibilidade.

O primeiro sync havia criado 859 falsos positivos de acessibilidade cultural
porque a consulta não exigia item efetivamente publicado. O finding foi
preservado, a fonte foi alinhada ao audit cultural canônico e o sync seguinte
encerrou essas projeções sem apagá-las e sem reescrever o histórico.

## Resultado

`COMUN_OPERATIONS_GREEN`

O domínio `operations` foi promovido para `green`. Permanecem cinco itens reais
para o trabalho cotidiano da equipe; a existência da fila não bloqueia o
domínio, pois a Central os tornou visíveis, explicáveis e acompanháveis. A
rotina não pontua pessoas, não deriva prioridade de popularidade e não executa
decisões editoriais, políticas ou de publicação.

`launch_publicly` não foi acionado.
