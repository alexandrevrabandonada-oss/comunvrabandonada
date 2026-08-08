# COMUN 48.1B-P3B-C4 — diagnóstico da injeção de ambiente

Data de referência: 2026-08-08

## Estado inicial

- baseline: `e964ed7596c620bf69bcb73c30593de3bec21b5f`;
- resultado anterior: `COMUN_P3B_BLOCKED_NEW_KEY_NOT_VISIBLE_TO_RUNTIME`;
- localização: desligada e cloaked;
- fotos privadas: ligadas;
- coletivos, mapa público, território, Google, Ônibus e forwarding: desligados;
- `launch_publicly=false`.

## Contrato do diagnóstico

O diagnóstico separa quatro provas: metadata da Vercel, valor efetivo via `vercel env run`, runtime do deployment Production sem domínio e runtime canônico. Nenhuma fixture pode ser criada antes das três primeiras provas verdes.

O probe temporário responde somente no hostname específico do deployment staged e retorna exclusivamente booleanos. O domínio canônico recebe `404`. Nenhum valor, fragmento, tamanho textual ou hash de segredo é registrado.

## Estado desta revisão

- testes focais: 3/3;
- typecheck: verde;
- lint: verde;
- build: verde;
- migration: nenhuma;
- mudança de schema: nenhuma;
- mudança de flag: nenhuma;
- fixture: nenhuma;
- deploy: pendente da lane sanitizada;
- resultado: `COMUN_P3B_ENV_DIAGNOSIS_IMPLEMENTED_STAGED_EXECUTION_PENDING`.
