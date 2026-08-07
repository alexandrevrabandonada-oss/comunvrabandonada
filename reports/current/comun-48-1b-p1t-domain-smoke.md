# COMUN 48.1B-P1T — smoke do domínio

Resultado: `COMUN_48_1B_P1T_REMOTE_TERRITORY_SCHEMA_GREEN_FLAG_OFF`.

Flags mantidas desligadas:

- `COMUN_TERRITORY_PROFILE_ENABLED=disabled`;
- `COMUN_TERRITORY_CATALOG_LOCAL=disabled`.

Rotas esperadas:

- `/comun` — 200;
- `/comun/entrar` — preservada;
- `/comun/criar-conta` — preservada;
- `/comun/relatar` — 200;
- `/comun/calcadas` — 200;
- APIs experimentais — dormentes;
- zero 5xx.

Smoke read-only em `https://comunsocial.online` após deployment:

- `/comun` — 200;
- `/comun/entrar` — 200;
- `/comun/criar-conta` — 200;
- `/comun/relatar` — 200;
- `/comun/calcadas` — 200.

O HTML não contém as chaves territoriais nem a flag de ativação. A ocorrência textual de “Volta Redonda” pertence a conteúdo público existente da rota, não a fixture P1T; não houve dado sintético exposto.
