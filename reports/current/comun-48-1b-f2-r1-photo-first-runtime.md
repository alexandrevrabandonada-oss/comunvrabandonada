# COMUN 48.1B-F2-R1 — photo-first runtime

Data: 2026-08-09

## Baseline

- M1 remoto:
  `COMUN_48_1B_F2_M1_SEMANTIC_TEXT_ABSENCE_REMOTE_GREEN_RUNTIME_OFF`;
- `origin/main`: `8f26cdaa852e678a256c6ddcc948c7f6eefd2067`;
- branch: `codex/48-1b-f2-r1-photo-first-runtime`;
- uma migration R1 de substituição da RPC amplia o domínio photo-only somente
  para `other|sidewalk_accessibility`; nenhuma migration ficará pendente para
  o C1;
- plano remoto reconciliado: exatamente
  `20260809055800_comun_relata_photo_first_domain_categories.sql`, sem
  `--include-all`, repair, reset ou seed
  (`COMUN_F2_R1_REMOTE_PLAN_EXACT_ONE`).

## Contrato R1

- flag explícita `COMUN_RELATA_PHOTO_ONLY_ENABLED`;
- barreira cumulativa: persistência Relata, captura rápida e attachments P3
  precisam estar ativos;
- deploy inicial deve manter a flag desligada;
- a API aceita texto válido ou `text: null` com `hasPhoto: true` no modo
  `quick_v2`;
- string vazia, texto entre 1 e 7 caracteres, respostas de triagem no caminho
  sem texto ou foto ausente não criam `NULL`;
- o caminho sem texto usa categoria `other`, urgência `attention`, privacidade
  `sensitive`, confiança `low`, revisão humana e enriquecimento obrigatórios;
- publicação e forwarding automáticos permanecem proibidos;
- `routeRelata` continua estritamente textual;
- a UI não fabrica descrição nem persiste placeholder;
- a RPC preserva integralmente o caminho textual M1 e permite que o C1 use
  `sidewalk_accessibility` com o mesmo bloqueio de automação, sem criar adapter
  antecipadamente;
- se o upload falhar, o Relata privado, o recibo e a Carteira preservam o
  caminho de nova tentativa no painel P3.

## Prova descartável

O job `COMUN F2 R1 / photo-first runtime E2E` usa Supabase loopback, sem
credenciais remotas. O head exato `e02fd0600d916dc8bdb450bb94506cf7e20a5dce`
provou `original_text IS NULL`, decisão segura, retry do upload P3, foto privada
selada, vínculo na Carteira, zero snapshot, zero forwarding e cleanup exato da
fixture:
`COMUN_48_1B_F2_R1_PHOTO_FIRST_DISPOSABLE_GREEN`.

## Merge, promoção e Production

- PR `#239` mesclada no head exato
  `e02fd0600d916dc8bdb450bb94506cf7e20a5dce`; merge
  `af95039a4c29c90f803d4c8910d0d569e6458253`;
- migration `20260809055800_comun_relata_photo_first_domain_categories.sql`
  promovida exatamente uma vez e postflight de função/grants verde;
- deploy inicial OFF: `dpl_EQjXm1r6BCdkRyJJyXvtwU9xzFjj`;
- deploy ativado: `dpl_ApC89L6EimuvRCoj1ukePhiJvEde`;
- PR operacional `#240`, merge
  `f57cfc8a9700a176c85836fa27b072e9e9b2fec0`;
- fixture Production e cleanup exato: run `31299281446`, sem recovery de
  emergência, com zero publicação e forwarding.

Resultado:
`COMUN_48_1B_F2_R1_PHOTO_FIRST_PRODUCTION_GREEN_CLEANUP`.
