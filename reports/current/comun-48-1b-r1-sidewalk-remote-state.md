# COMUN 48.1B-R1 — estado remoto de Calçadas

Data: 2026-08-05  
Branch: `codex/tijolo-48-1b-production-domain-pilot`  
PR: [#174](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/174)  
HEAD: `2b31d3a69e55a13593382b108c38e1a48845714a`  
Baseline: `7e2d259e193c0d8841c57b89002f551c9a9c2ad`

## Resultado

`COMUN_48_1B_R1_BLOCKED_SIDEWALK_REMOTE_STATE_UNPROVEN`

O diagnóstico remoto read-only foi executado pelo workflow canônico
`comun-sidewalk-remote-diagnostic.yml`, no run
`31011836481`. O artefato sanitizado classificou o escopo como
`INSUFFICIENT_READ_PERMISSION`. Não houve escrita remota.

Há evidências parciais úteis, mas insuficientes para promover a migration à
classe `APPLIED_EXACT_EXTERNAL_LEDGER`: o ledger próprio foi lido como
`PRESENT_ACCEPTED` e o fingerprint estrutural específico de Calçadas coincide
com o POST local (`4bebf4c1...`), porém o fingerprint global observado não
coincide com PRE nem POST canônicos e o classificador canônico não conseguiu
provar todos os gates globais de leitura/segurança. Portanto, não se afirma
que a migration esteja aplicada exatamente para fins de reconciliação do CLI.

## Evidência sanitizada

- release: `20260724233256-comun-sidewalk-operational-hardening`;
- migration: `supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql`;
- SHA-256 da migration: `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`;
- ledger: `PRESENT_ACCEPTED`;
- fingerprint scoped remoto: `4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8`;
- fingerprint scoped POST local: igual ao remoto;
- fingerprint global remoto: `93c6a029...` (não PRE/POST esperados);
- grant audit: `REMOTE_EQUIVALENT_TO_PRE` / `equivalent_pre`;
- `zeroRemoteWrites: true`;
- artefato: `classification.json`, `diagnostic.json`, `diagnostic.md` do run `31011836481`.

O primeiro dispatch na branch falhou apenas no guard de referência local do
workflow (run `31011745017`), antes de acessar o banco. O retry focal no
`main`, com o mesmo baseline e perfil PRE v2, passou integralmente e é a fonte
da evidência acima; isso não é finding do produto.

## Decisão

Não executar migration, runner `migrate`, `repair`, `reset`, `--include-all`,
seed ou qualquer escrita. A classificação A não é permitida enquanto a
permissão/estado global não forem comprovados. A classificação B também não é
permitida porque o ledger não pode ser tratado como ausente e o estado PRE
exato não foi demonstrado pelo classificador canônico.

O piloto, flags, Google, allowlist, deployment de piloto e
`launch_publicly` permanecem fechados.
