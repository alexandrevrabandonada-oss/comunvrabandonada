# COMUN 48.1B-P2 — smoke de Production

## Plano staged

1. Deploy de código com `COMUN_RELATA_PERSISTENCE_ENABLED=disabled` e
   `COMUN_QUICK_CAPTURE_V2=disabled`; Conta e Carteira permanecem ativas.
2. Ativar persistência canônica sem alterar a UI; executar somente smoke técnico
   sem criar relato real.
3. Ativar Quick Capture; confirmar a superfície textual e a ausência de foto,
   localização, mapa e APIs de evidência.

## Estado desta branch

O smoke de Production só será executado após o merge e deployment desta PR.
Nenhuma flag P2 foi alterada nesta etapa e nenhum registro sintético foi criado
em Production.

Expected post-activation:

- `/comun/relatar`: Quick Capture textual.
- `/comun/relatar?modo=detalhado`: fallback preservado.
- `/api/comun/relata/evidence/*`: `404`.
- Ônibus, forwarding, território e Google: desligados.
- `launch_publicly=false`.
