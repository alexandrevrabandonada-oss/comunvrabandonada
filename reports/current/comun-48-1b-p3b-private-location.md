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

Resultado de código: `COMUN_P3B_CODE_READY_CI_RUNTIME_PENDING`.
