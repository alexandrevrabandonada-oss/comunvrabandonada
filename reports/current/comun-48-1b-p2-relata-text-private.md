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
- Rehearsal runtime: lane CI descartável adicionada. O primeiro replay funcional
  foi corrigido no fixture e o terceiro run parou antes do harness por `502` no
  restart do Supabase descartável; a lane foi alinhada ao startup canônico para
  um retry focal. Execução local permanece bloqueada pelo daemon Docker.

## Segurança

Nenhum texto de relato, segredo, cookie, coordenada, arquivo ou chave é colocado
em artefatos públicos. Não há snapshot público, anexo, localização, coletivo ou
forwarding criado pelo P2.
