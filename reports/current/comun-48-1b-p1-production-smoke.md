# COMUN 48.1B-P1 — smoke de Production

Estado antes do merge: Production preservada no núcleo público; superfícies de piloto continuam dormentes. A execução deste smoke depende do novo deployment após merge e das duas fases de flags descritas no relatório de ativação.

Critérios: `/comun=200`, `/comun/relatar=200`, `/comun/calcadas=200`; APIs de Relata novo, Ônibus, forwarding e Carteira retornam `404` enquanto desligadas; nenhum `405`; nenhuma migration ou escrita de piloto fora da ativação autorizada; `launch_publicly=false`.
# COMUN 48.1B-P1 — smoke de Production

## Checkpoint read-only (2026-08-07)

Sem deployment de ativação nesta etapa. Smoke contra `https://comunsocial.online`:

- `/comun`: `200`;
- `/comun/relatar`: `200`;
- `/comun/calcadas`: `200`;
- `/comun/relata`: `404`;
- `/comun/onibus`: `404`;
- `/api/comun/participation-wallet`: `404`.

Nenhuma flag foi ativada, nenhuma migration remota foi executada e nenhum dado
remoto foi criado. O piloto continua fechado até a CI focal de regressão verde.
