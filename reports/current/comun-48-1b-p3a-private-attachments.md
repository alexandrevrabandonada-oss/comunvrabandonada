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
descartável `COMUN P3A / private attachments E2E` passou nos runs de PR
`31205708682` (5m06s) e `31206331155` (head documental), incluindo upload assinado, finalização, derivada,
leituras autorizadas/negadas, limite de três anexos, retirada e cleanup exato.
As duas falhas anteriores foram corrigidas apenas no harness: argumentos de
cleanup ausentes e preservação do trigger append-only durante a remoção da
fixture descartável.

Commits relevantes: `330bafc`, `68f9d13`, `790a847`, `20a7a29`, `545dd71`, `bab8ff7`.
PR `#183` foi mesclada em `6571c75acc49a234a1258ac8a588ee52ba76600d`.

Resultado técnico: `COMUN_P3A_ATTACHMENTS_DISPOSABLE_E2E_GREEN`.
Resultado remoto: `COMUN_P3A_REMOTE_ATTACHMENT_PREFLIGHT_GREEN`.

Após o merge, `COMUN_RELATA_ATTACHMENTS_ENABLED=enabled` foi ativada isoladamente;
`COMUN_RELATA_LOCATION_ENABLED=disabled` e `COMUN_RELATA_COLLECTIVE_ENABLED=disabled`
permaneceram desligadas. O domínio exibiu o controle de foto e não exibiu o
controle de localização.

Prova sintética real em Production: criação privada, início 201, signed upload
direto 200, finalização 200, leitura autorizada 200 (`image/webp`), leitura com
recibo inválido 404 e retirada 200. A fixture usou imagem gerada pelo navegador
e nenhum dado pessoal. O objeto de quarentena e a derivada foram removidos por
runner server-side temporário, com `quarantineResidual=0` e `sealedResidual=0`.
O histórico retirado permanece conforme a política de retenção; a Carteira ficou
com zero itens ativos.

Resultado terminal P3A: `COMUN_48_1B_P3A_PRIVATE_ATTACHMENTS_DOMAIN_GREEN_LOCATION_OFF`.
