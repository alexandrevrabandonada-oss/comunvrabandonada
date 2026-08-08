# COMUN 48.1B-P3B — localização privada criptografada

## Implementação

- localização separada da foto por `COMUN_RELATA_LOCATION_ENABLED`;
- `relata-location-key-v1`, AES-256-GCM, nonce de 12 bytes e AAD vinculada ao protocolo;
- HMAC espacial não é lido nem derivado com coletivos desligados;
- resposta, recibo, Carteira e rascunho do navegador não recebem coordenadas;
- `sessionStorage` conserva somente `hasPrivateLocation` e metadados não sensíveis;
- falhas de foto e localização são independentes e não desfazem o relato;
- ponto e acurácia são limpos após persistência bem-sucedida;
- localização permanece opcional e só solicita geolocalização após gesto explícito.

## Verificação estática

Testes focais de evidência e contrato P3B: verdes. Typecheck, lint e build: verdes. A lane descartável testa duas localizações sintéticas na mesma posição, ciphertext/nonce distintos, round-trip server-side, acesso incorreto negado, retirada append-only e ausência de projeção coletiva.

Resultado de código: `COMUN_P3B_RUNTIME_E2E_GREEN`.

## Cleanup e F1

O cleanup da fixture órfã foi autorizado e inicialmente alcançou `COMMIT`, mas
o pós-voo falhou por uma comparação `text = uuid`. O runner foi corrigido para
falhar fechado, tipar `subject_ref` como texto e oferecer verificação somente
leitura. O run `31239240233` comprovou:

- `activeLocationCount=0`;
- `withdrawnLocationCount=1`;
- `withdrawnCaseCount=1`;
- `withdrawnReportCount=1`;
- `activeWalletItemCount=0`;
- `revokedWalletCount=1`;
- `activeRecoveryCredentialCount=0`;
- `activeAccountLinkCount=0`;
- `forwardingCount=0`;
- `hardDeletes=0`;
- `plaintextLocationRead=false`.

Foi criada a migration forward-only
`20260808043000_comun_relata_location_readd_state_fix.sql` (SHA-256
`5a0b9ba71ac63d8ca578049963158e335183d580f920667cd803c6bfb2c6a5a5`) para
restaurar `evidence_state='added_private'`, substituir toda a metadata e
limpar `withdrawn_at` no `ON CONFLICT(report_id)`. A localização permanece OFF
até sua promoção remota e postflight.

## Estado remoto e C2

- cleanup órfão comprovado no run `31239240233`, com `hardDeletes=0` e
  `plaintextLocationRead=false`;
- F1 `20260808043000_comun_relata_location_readd_state_fix.sql`, SHA-256
  `5a0b9ba71ac63d8ca578049963158e335183d580f920667cd803c6bfb2c6a5a5`,
  promovida pelo runner autorizado e validada no run `31243106898`;
- workflow de reativação integrado em `1e74bf5b9ca797c0f2a43bc4310bdea1fb2ba5da`
  e refinado nos PRs #196, #197, #198 e #199;
- o smoke real recebeu `404` na criação de localização mesmo com os nomes das
  variáveis server-side presentes. A causa permanece a chave de localização
  inválida/indisponível para o gate de runtime (`validLocalKey` exige 32 bytes
  base64url). Nenhum valor foi lido, impresso ou alterado;
- rollback executado no run `31244127100`; localização voltou a `404` e a flag
  está desligada.

Resultado atual: `COMUN_P3B_BLOCKED_LOCATION_RUNTIME_KEY_INVALID_OR_UNAVAILABLE`.
O resultado `COMUN_48_1B_P3_PRIVATE_EVIDENCE_DOMAIN_GREEN` não pode ser emitido
sem uma chave server-side atual válida e um novo smoke com cleanup comprovado.
