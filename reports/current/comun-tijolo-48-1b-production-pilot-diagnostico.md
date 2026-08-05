# Tijolo 48.1B — diagnóstico do piloto em Production

Data: 2026-08-05  
Branch: `codex/tijolo-48-1b-production-domain-pilot`  
Baseline: `origin/main` `7e2d259e193c0d8841c57b89002f551c9a9c2ad`

## Resultado

O piloto não foi ativado. A tentativa R1 executou o diagnóstico canônico
read-only e não conseguiu provar o estado remoto completo de Calçadas:

`COMUN_48_1B_R1_BLOCKED_SIDEWALK_REMOTE_STATE_UNPROVEN`

`20260724233256_comun_sidewalk_operational_hardening.sql` existe no checkout,
mas aparece sem correspondência no ledger do CLI, enquanto migrations
posteriores já constam como aplicadas. O diagnóstico externo encontrou ledger
próprio `PRESENT_ACCEPTED` e fingerprint scoped igual ao POST local, porém
classificou o conjunto como `INSUFFICIENT_READ_PERMISSION` por não provar os
gates globais. O CLI recusou o dry-run com `LegacyDbPushMissingRemoteError` e
sugeriu `--include-all`.

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
- workflow read-only canônico: run `31011836481` verde;
- MCP/diagnóstico global permanece sem permissão suficiente para fechar a prova;
- migration histórica permanece byte a byte igual;
- Production não foi alterada.

## Decisão

O piloto permanece fechado até reconciliar o histórico com evidência do estado
remoto e um plano forward-only explícito. Não há base segura para criar uma
exceção do ledger do CLI, executar o runner de migration ou promover schema.
Relata V2, Calçadas, Carteira, Ônibus e Observatórios continuam sem ativação.
