# COMUN 48.1B-R1 — estado remoto de Calçadas

Data: 2026-08-05  
Branch: `codex/tijolo-48-1b-production-domain-pilot`  
PR: [#174](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/174)  
HEAD auditado antes da correção: `77a736dca196e654282f651d8e9adfb4048f358e`
Patch R1A: `4d9eae23ed5f9bc02c035d17defa62af58c363b2`
Baseline: `7e2d259e193c0d8841c57b89002f551c9a9c2ad`

## Resultado

`COMUN_48_1B_R1A_SIDEWALK_APPLIED_EXACT_SCOPED_EXTERNAL_LEDGER`

O diagnóstico remoto read-only foi executado pelo workflow canônico
`comun-sidewalk-remote-diagnostic.yml`, no run
`31011836481`. O artefato sanitizado classificou o escopo como
`APPLIED_EXACT_SCOPED_EXTERNAL_LEDGER` após o replay corrigido. Não houve
escrita remota.

O ledger próprio foi lido como `PRESENT_ACCEPTED`, o fingerprint estrutural
específico de Calçadas coincide com o POST local
(`4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8`) e todos
os objetos decisivos estão em `equal` ou `post`; o ledger dinâmico foi excluído
da decisão estrutural. O grant audit `REMOTE_EQUIVALENT_TO_PRE` é
`equal_pre_post`, portanto não bloqueia. O fingerprint global divergente foi
classificado como `EXPECTED_GLOBAL_EVOLUTION_AFTER_SCOPED_RELEASE` porque há
migrations posteriores no histórico remoto.

## Evidência sanitizada

- release: `20260724233256-comun-sidewalk-operational-hardening`;
- migration: `supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql`;
- SHA-256 da migration: `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`;
- ledger: `PRESENT_ACCEPTED`;
- fingerprint scoped remoto: `4bebf4c1db4da58fd9710c7f9478bb2837b171aa4620de2d376e19d5a99b66d8`;
- fingerprint scoped POST local: igual ao remoto;
- fingerprint global remoto: `93c6a029...` (não PRE/POST esperados);
- grant audit: `REMOTE_EQUIVALENT_TO_PRE`, com PRE=POST (`equal_pre_post`);
- `zeroRemoteWrites: true`;
- artefato: `classification.json`, `diagnostic.json`, `diagnostic.md` do run `31011836481`.

O primeiro dispatch na branch falhou apenas no guard de referência local do
workflow (run `31011745017`), antes de acessar o banco. O retry focal no
`main`, com o mesmo baseline e perfil PRE v2, passou integralmente e é a fonte
da evidência acima; isso não é finding do produto.

## Decisão

A exceção externa foi criada e validada. A migration histórica não foi
executada novamente. A quarentena temporária foi aplicada com restauração por
`try/finally`; o SHA foi confirmado após a restauração. O dry-run reconciliado
ficou limpo para as migrations classificadas, mas revelou uma migration sem
manifesto (`20260805090000_comun_member_profile_territory_selection.sql`),
portanto o baseline final não é vazio.

Resultado: `COMUN_48_1B_R1A_BLOCKED_PENDING_MIGRATION_CLASSIFICATION`.

Não executar `repair`, `reset`, `--include-all`, seed ou qualquer escrita.

O piloto, flags, Google, allowlist, deployment de piloto e
`launch_publicly` permanecem fechados.
