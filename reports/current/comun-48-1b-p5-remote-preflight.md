# COMUN 48.1B-P5 — preflight remoto

Data: 2026-08-08

## Resultado

`COMUN_P5_REMOTE_PREFLIGHT_GREEN`

- baseline: `6b037d6dd3ffc617c6c47d26adb466eaaf7639bd`;
- execução read-only sanitizada: GitHub Actions `31279521086`;
- transação: `read only`;
- conteúdo de negócio lido: não;
- objetos P5 de Ônibus encontrados: zero;
- objetos P5 de forwarding/STMU encontrados: zero;
- `public.comun_official_protocols` permanece fora do escopo P5 e sem CRUD direto para `PUBLIC`, `anon` ou `authenticated`;
- migrations locais históricas 48.0E/H/K/L não serão promovidas;
- classificação: é necessária uma única migration P5 aditiva e consolidada;
- escrita remota: zero.

O primeiro run terminou vermelho apenas porque o parser conservou os marcadores `BEGIN` e `ROLLBACK` junto ao JSON. A consulta e o artifact sanitizado foram concluídos; o workflow foi corrigido para saída silenciosa sem ampliar a leitura.
