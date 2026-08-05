# Tijolo 48.1B — diagnóstico do piloto em Production

Data: 2026-08-05  
Branch: `codex/tijolo-48-1b-production-domain-pilot`  
Baseline: `origin/main` `7e2d259e193c0d8841c57b89002f551c9a9c2ad`

## Resultado

O piloto não foi ativado. O preflight read-only encontrou drift no histórico
remoto de migrations antes de qualquer `db push` mutável:

`COMUN_48_1B_BLOCKED_REMOTE_MIGRATION_PLAN_DRIFT`

`20260724233256_comun_sidewalk_operational_hardening.sql` existe no checkout,
mas aparece sem correspondência remota, enquanto migrations posteriores já
constam como aplicadas. O CLI recusou o dry-run com `LegacyDbPushMissingRemoteError`
e sugeriu `--include-all`.

Não foi executado `--include-all`, `db push` mutável, `migration repair`, reset,
seed, configuração de Auth, alteração de flags, deployment ou escrita de
registros. O Supabase remoto só foi consultado por operações read-only da CLI.

## Evidência

- CLI Supabase: 2.111.0;
- projeto alvo visível na listagem da CLI;
- `migration list --linked`: executado com sucesso;
- `db push --linked --dry-run`: interrompido pelo drift histórico;
- migration divergente: SHA-256
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`;
- MCP permanece sem permissão suficiente para o projeto;
- Production não foi alterada.

## Decisão

O piloto permanece fechado até reconciliar o histórico com evidência do estado
remoto e um plano forward-only explícito. Não há base segura para promover
schema, ativar Relata V2, Calçadas, Carteira, Ônibus ou Observatórios.
