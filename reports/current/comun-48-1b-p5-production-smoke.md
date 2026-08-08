# COMUN 48.1B-P5 — smoke de Production

Estado: não executado; candidato ainda não integrado nem promovido.

## Sequência obrigatória

1. merge exact-head com CI integral verde;
2. promoção da única migration com ambas as flags desligadas;
3. postflight de RLS/grants;
4. deploy flags-off e comprovação de `404` uniforme;
5. ativação P5A e fixture sintética com cleanup em `finally`;
6. ativação P5B e prova read-only, sem abrir qualquer canal real;
7. observabilidade e rollback independente por flag.

Nenhum envio sintético será realizado à STMU em Production.
