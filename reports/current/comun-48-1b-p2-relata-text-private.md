# COMUN 48.1B-P2 — Relata textual privado

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
- Rehearsal runtime: no run `31188219109`, o harness passou
  (`COMUN_P2_RELATA_TEXT_DISPOSABLE_E2E_GREEN`, sem snapshot público e sem
  anexos), mas o processo `npm/next-server` ficou órfão e a etapa foi cancelada
  antes do cleanup. O patch seguinte encerra o servidor por grupo de processos
  e aguarda sua saída antes de parar o Supabase. O mesmo artifact revelou que o
  redator precisava mascarar chaves no formato tabular do Storage; essa correção
  também foi incluída. A lane permanece pendente de um retry novo.

## Segurança

Nenhum texto de relato, segredo, cookie, coordenada, arquivo ou chave é colocado
em artefatos públicos. Não há snapshot público, anexo, localização, coletivo ou
forwarding criado pelo P2.
