# COMUN 48.1B-P1T — smoke do domínio

Pendente até o merge e deployment da PR.

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
