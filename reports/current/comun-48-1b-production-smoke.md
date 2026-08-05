# 48.1B — smoke de Production

Smoke read-only de baseline (antes de qualquer ativação):

- `/comun`: 200;
- `/comun/relatar`: 200;
- `/comun/calcadas`: 200;
- Relata novo, Ônibus, forwarding, STMU e APIs experimentais: dormentes;
- nenhuma migration, flag, allowlist ou envio externo executado.

Não houve smoke de funcionalidades do piloto porque elas não foram ativadas.
O resultado técnico é bloqueado por drift de migration, não por regressão de
Production.
