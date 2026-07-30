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

## Evidência

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

O resultado remoto será consolidado após PR, migration aditiva, sincronização,
ensaio privado e postflight independentes. Até lá, o domínio permanece
`in_progress`.
