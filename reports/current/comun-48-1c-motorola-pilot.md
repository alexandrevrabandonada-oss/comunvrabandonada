# COMUN 48.1C — piloto humano Motorola

## PILOTO PAUSADO FOCALMENTE — J1/J3

Atualizado em 09/08/2026.

- baseline de preparação: `origin/main=ab9e9434a12f778c04ea9baf5760b89cf5ffdf4b`;
- P6A está terminal e ativo, sem auto-send;
- Google Auth está tecnicamente ativo em Production, mas o micro-gate humano
  completo de P1G permanece pendente;
- `launch_publicly=false`;
- participantes completos contabilizados: `0`;
- tentativas humanas iniciadas: `1` (`P01`), sem sucesso de jornada contado;
- jornadas afetadas pausadas: `P01 / J1` e `P01 / J3`;
- conteúdo criado em Production por esta preparação: `0`;
- migrations 48.1C: `0`.

48.1C permanece em andamento, com pausa focal somente nas jornadas afetadas.
O finding não autoriza P6B nem amplia o piloto.

## Protocolo e privacidade

As sete jornadas, métricas, regra de ajuda, score Motorola e severidades estão
definidos em `docs/comun-48-1c-motorola-pilot-protocol.md`. O template permitido
fica em `reports/templates/comun-48-1c-human-session.template.md`; o soft cleanup
fica em `docs/comun-48-1c-motorola-pilot-cleanup.md`.

A auditoria da telemetria existente confirmou coleta desacoplada de conta e
limitada a evento, contagem de interações, faixa de duração, categoria e código
de erro interno. Nenhum campo de identidade ou conteúdo foi adicionado.

## Participantes completos

`0` — `P01` iniciou a tentativa, mas o finding P1 interrompeu J1/J3 antes de
uma jornada completa; a tentativa não é contada como sucesso.

## Jornadas executadas

`P01 / J1` e `P01 / J3` foram tentadas e pausadas pelo finding abaixo. As
demais jornadas não foram iniciadas neste registro.

## Mediana e buckets

Sem dados humanos. A meta de mediana menor que 30 segundos não foi declarada
atingida.

## Taxa sem ajuda

Sem dados humanos.

## Taxa de compreensão

Sem dados humanos.

## Findings P0/P1/P2/P3

### MOTOROLA-P1-001 — aberto

- participante/jornadas: `P01 / J1` e `P01 / J3`;
- tipo: `form/navigation`;
- observado: o QuickCapture podia retirar a ação `Guardar` depois de uma
  pergunta adaptativa; em Calçadas a resposta era tratada pela chave errada e
  a pessoa era empurrada para “Abrir formulário detalhado”, pertencente a outro
  pipeline de persistência;
- ação: jornadas pausadas até o patch `48.1D-S1` ficar verde em Production;
- contagem: a tentativa que encontrou o P1 não conta como sucesso da jornada;
- reteste: pendente, primeiro em `P01 / J1` e depois em `P01 / J3`.

## Decisões

- não ampliar analytics nem schema;
- não misturar o micro-gate Google às sete jornadas;
- não abrir canais externos em cenários sintéticos;
- priorizar celular no primeiro ciclo;
- o finding humano acionou 48.1D-S1 antes de qualquer P6B.

## Próximo passo operacional

Concluir 48.1D-S1, retestar `P01 / J1` e `P01 / J3` e somente então continuar
as demais jornadas do piloto. P6B permanece proibido.
