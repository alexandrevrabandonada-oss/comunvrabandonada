# COMUN 48.1B-P1 — preflight remoto

Data: 2026-08-06

- baseline local: `903c7519658395eba7e9b0437c1cb236ffbaea38`;
- projeto Supabase visível pela CLI: `nvmdszymrtacfehdynpg`;
- CLI: `2.111.0`;
- região observada: `us-west-2`;
- `migration list --linked`: histórico alinhado, exceto a release externa de Calçadas já documentada;
- `db push --linked --dry-run` após quarentena temporária somente da migration externa: plano vazio (`upToDate=true`);
- a migration excepcional foi restaurada byte a byte, SHA `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`;
- schema remoto já contém perfil comunitário e tabelas/RPCs da Carteira;
- tabelas privadas: RLS/grants sem acesso direto para `public`, `anon` ou `authenticated`;
- nenhum conteúdo, usuário real ou dado privado foi consultado;
- nenhuma migration, flag ou dado remoto foi alterado.

Estado: `COMUN_48_1B_P1_REMOTE_PREFLIGHT_GREEN_SCHEMA_PRESENT`.

A ativação do P1 continua separada do preflight: primeiro deployment com registro fechado e Carteira desligada; depois abertura explícita da conta e, em seguida, Carteira.
