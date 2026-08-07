# COMUN 48.1B-P3A — fotos privadas

Implementação preparada na branch `codex/48-1b-p3a-private-attachments`:

- `COMUN_RELATA_ATTACHMENTS_ENABLED` separado de localização;
- localização e agrupamento permanecem 404 quando desligados;
- início de anexo valida recibo/MIME/tamanho e gera signed upload URL privada;
- bytes seguem diretamente do navegador para `comun-relata-private`;
- finalização server-side baixa a quarentena, valida magic bytes/Sharp, recodifica
  WebP e remove a quarentena;
- GET devolve somente derivada mediante recibo válido;
- limite de três anexos e `review_required_for_publication=true` preservados;
- relato não é desfeito quando a foto falha;
- flags de Production ainda não existem/estão desligadas.

Verificação local: unitários focais 14/14, unitários completos 507/507,
typecheck, lint, build, YAML do workflow e `git diff --check` verdes. A lane
descartável `COMUN P3A / private attachments E2E` passou no run de PR
`31205708682` (5m06s), incluindo upload assinado, finalização, derivada,
leituras autorizadas/negadas, limite de três anexos, retirada e cleanup exato.
As duas falhas anteriores foram corrigidas apenas no harness: argumentos de
cleanup ausentes e preservação do trigger append-only durante a remoção da
fixture descartável.

Commits relevantes: `330bafc`, `68f9d13`, `790a847`, `20a7a29`, `545dd71`.
PR draft: `#183` — `48.1B-P3A — fotos privadas por signed upload`.

Resultado técnico: `COMUN_P3A_ATTACHMENTS_DISPOSABLE_E2E_GREEN`.
Resultado operacional parcial: `COMUN_P3A_IMPLEMENTATION_READY_REMOTE_PREFLIGHT_BLOCKED`.
O preflight remoto de Storage/RLS/grants/RPCs continua bloqueado por ausência
de credencial server-side utilizável nesta sessão; não houve deploy, flags,
fixture ou escrita em Production.
