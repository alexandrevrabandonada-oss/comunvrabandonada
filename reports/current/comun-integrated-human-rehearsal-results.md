# Resultado do ensaio humano integrado 48.0M

## Estado

`COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE`

O responsável pelo produto confirmou smoke LAN humano: abertura correta em computador e celular pela rede local, rotas necessárias acessíveis e nenhuma submissão externa. Resultado técnico adicional: `COMUN_REHEARSAL_48_0M_LAN_SMOKE_GREEN`.

A PR #168 foi mesclada no SHA `dbdf61a39deecefc558e8ee1ee527a4ba326d4d3`. O smoke read-only pós-merge preservou as rotas públicas e manteve Relata, Ônibus, forwarding, STMU e ambiente de ensaio dormentes (`404`). Resultado terminal técnico: `COMUN_REHEARSAL_48_0M_MERGED_DORMANT_ENVIRONMENT_READY_HUMAN_SESSION_PENDING_REMOTE_UNCHANGED`.

Essa confirmação não contabiliza participante completo. Não foram medidos tempos, não foram executadas todas as tarefas, não houve três participantes e não há resultado de usabilidade para promover. O preflight automatizado ficou em `COMUN_REHEARSAL_48_0M_ENVIRONMENT_READY_HUMAN_SESSION_PENDING`.

## O que foi comprovado automaticamente

Captura 10/10; Carteira 5/5 E2E e 5/5 Axe; forwarding 5/5 E2E e 5/5 Axe; Ônibus 5/5 E2E e 5/5 Axe; DB/RLS/grants verdes; Production dormente.

## Pendências humanas

Sessão mínima de três participantes, 200%/leitor de tela quando possível, opção 3 do WhatsApp sem caso fictício e verificação de e-mail neutra continuam pendentes. Este documento não declara ensaio humano concluído nem habilita captura pública.

## Checkpoint pós-48.1A

O fechamento documental da 48.1A foi integrado pela PR #172 no SHA
`c35776513ea3141171b843f696edb1df81232979`. O smoke read-only posterior
confirmou `/comun`, `/comun/relatar` e `/comun/calcadas` em 200; `/comun/relata`,
`/comun/onibus`, forwarding, STMU e ambiente de ensaio permaneceram 404. Todos
os métodos do endpoint dormente do Relata (GET, POST, PUT, PATCH, DELETE,
HEAD e OPTIONS) responderam 404.

Nenhuma sessão humana integrada foi executada neste checkpoint: não foram
disponibilizados três participantes reais, portanto não há tempos, taxa de
conclusão, pedidos de ajuda ou achados de usabilidade a contabilizar. O estado
continua `COMUN_INTEGRATED_HUMAN_REHEARSAL_INCOMPLETE`.
