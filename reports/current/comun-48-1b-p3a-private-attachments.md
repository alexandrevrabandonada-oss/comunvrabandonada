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
descartável `COMUN P3A / private attachments E2E` foi adicionada e aguarda
execução CI no head publicado.

Commit: `330bafc`.
PR draft: `#183` — `48.1B-P3A — fotos privadas por signed upload`.

Resultado parcial: `COMUN_P3A_IMPLEMENTATION_READY_REMOTE_PREFLIGHT_BLOCKED`.
