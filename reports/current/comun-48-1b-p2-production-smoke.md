# COMUN 48.1B-P2 — smoke de Production

## Plano staged

1. Deploy de código com `COMUN_RELATA_PERSISTENCE_ENABLED=disabled` e
   `COMUN_QUICK_CAPTURE_V2=disabled`; Conta e Carteira permanecem ativas.
2. Ativar persistência canônica sem alterar a UI; executar somente smoke técnico
   sem criar relato real.
3. Ativar Quick Capture; confirmar a superfície textual e a ausência de foto,
   localização, mapa e APIs de evidência.

## Estado final

PR #181 foi mesclada em `15ce47426bd9693a799faef4475cbe3762dc38d2`.
Foram executados três deployments staged, sem POST de relato real e sem
registro sintético remoto:

- flags P2 off: `dpl_7yFy7adBNW5LENNAmXC6tpUQJrzC`;
- persistência canônica on / UI legacy: `dpl_ApZnWSgcneebNzJyPs9Q6EEnsxJn`;
- Quick Capture textual on: `dpl_542s3DLmDyTDur11Z4v3cxNBBt6k`.

Expected post-activation:

- `/comun/relatar`: 200 com `data-comun-quick-capture-v2`, sem foto ou
  localização.
- `/comun/relatar?modo=detalhado`: 200 e fallback preservado.
- `/comun`, `/comun/minha-participacao` e `/comun/calcadas`: 200.
- `/api/comun/relata` (GET), `/api/comun/relata/evidence/attachments` e
  `/api/comun/relata/evidence/location`: `404`.
- `/comun/onibus`: `404`; nenhum envio externo ou acesso ao canal ocorreu.
- `launch_publicly=false`; território, Google, foto e localização desligados.
