# COMUN 48.1B-P2 — Relata textual privado

Resultado: `COMUN_48_1B_P2_RELATA_TEXT_PRIVATE_DOMAIN_GREEN_EVIDENCE_OFF`.
PR #181 foi mesclada no commit `15ce47426bd9693a799faef4475cbe3762dc38d2`.

## Implementação

- Captura rápida textual com mínimo de 8 e máximo de 600 caracteres.
- Classificação determinística e pergunta adaptativa somente quando necessária.
- Estado `captured_private`, protocolo COMUN e aviso explícito de não envio.
- Associação compensável à Carteira; recuperação exibida somente na criação.
- Cookie de recibo permanece HttpOnly, `SameSite=Strict`, seguro em HTTPS e com
  caminho compatível com `/api/comun/relata/receipt`.
- `hasPhoto=true` é rejeitado quando a capacidade de evidência está desligada.
- Telemetria de foto/localização é rejeitada quando a capacidade está desligada.

## Verificações

- Unitários: 506/506.
- Typecheck: verde.
- Lint: verde.
- Build Next: verde.
- Topologia de migrations e release: verde.
- Privileges lint: verde.
- Contrato estático da lane P2: verde.
- Rehearsal runtime: run `31191438888` verde com
  `COMUN_P2_RELATA_TEXT_DISPOSABLE_E2E_GREEN`; snapshot público e anexos = 0,
  cleanup verde e artifact sanitizado disponível em
  `https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/31191438888/artifacts/`.
- O run anterior `31188219109` foi cancelado após harness verde por processo
  órfão; o head final encerra o servidor por grupo e mascara chaves tabulares
  do Storage.

## Segurança

Nenhum texto de relato, segredo, cookie, coordenada, arquivo ou chave é colocado
em artefatos públicos. Não há snapshot público, anexo, localização, coletivo ou
forwarding criado pelo P2. O dry-run remoto ficou vazio após quarentena
temporária somente da migration externa de Calçadas `20260724233256`, restaurada
com SHA `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.

## Production

- Flags-off: `dpl_7yFy7adBNW5LENNAmXC6tpUQJrzC`.
- Persistência ON / UI legacy: `dpl_ApZnWSgcneebNzJyPs9Q6EEnsxJn`.
- Quick Capture textual ON: `dpl_542s3DLmDyTDur11Z4v3cxNBBt6k`.
- Smoke `https://comunsocial.online`: `/comun/relatar` 200 com marcador V2 e
  sem foto/localização; `?modo=detalhado` 200; `/comun`, Minha Participação e
  Calçadas 200; Ônibus e APIs de evidência 404; nenhum POST real executado.
- Estado: Conta, Carteira, persistência Relata e Quick Capture textual ON;
  foto, localização, território, Google, Ônibus, forwarding e publicação OFF;
  `launch_publicly=false`.
