# COMUN 48.1B-P5 — smoke de Production

Data: 2026-08-08

## Resultado terminal

`COMUN_48_1B_P5_BUS_STMU_ASSISTED_DOMAIN_GREEN_NO_AUTO_SEND`

## Sequência executada

1. PR #232 mesclada em `87db9f7e5e76eed73a261fed5044393d719e42c4`;
2. preflight pós-merge `31284013965` confirmou plano exato de uma migration;
3. promoção `31284042454` e postflight `31284102583` ficaram verdes;
4. deployment flags-off `31284140151` comprovou cloak P5;
5. P5A foi ativada e passou no smoke real `31284226667`, com cleanup em
   `finally` e sem resíduo sintético ativo;
6. P5B foi rollbackada após uma assertion CI-only no run `31284318553`;
7. o hotfix operacional foi integrado pela PR #233 em
   `dd8fca19c074f77c145148bbf5ca5bc39f4eb058`;
8. P5B foi reativada e passou na prova read-only `31284607662`.

## Estado observado

- `/comun`: 200;
- `/comun/relatar`: 200;
- `/comun/calcadas`: 200;
- `/comun/minha-participacao`: 200;
- `/comun/onibus`: 200;
- Conta, Carteira, Relata, fotos, localização, Calçadas, Ônibus e STMU
  assistida: ON;
- mapa público geral, coletivos, território, Google e forwarding automático:
  OFF;
- publicação automática: OFF;
- `launch_publicly=false`;
- requests ao WhatsApp/e-mail durante os testes: zero;
- mensagens enviadas automaticamente: zero;
- protocolo oficial inventado: zero;
- resíduo sintético ativo do smoke P5A: zero.

O workflow P5B apenas verificou a capacidade no COMUN, os destinos allowlisted
e a invariância das tentativas. Nenhum canal externo foi aberto.
