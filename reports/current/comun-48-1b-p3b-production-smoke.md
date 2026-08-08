# COMUN 48.1B-P3B — smoke Production

Ainda não ativado. A sequência planejada é:

1. deploy com localização desligada e fotos preservadas;
2. configurar `COMUN_RELATA_LOCATION_ENCRYPTION_KEY` somente server-side;
3. confirmar staged check sanitizado de presença/validade sem expor o valor;
4. ativar somente `COMUN_RELATA_LOCATION_ENABLED`;
5. executar uma fixture sintética com coordenada fixa não real;
6. confirmar ciphertext, nonce, auth tag e ausência de plaintext na superfície;
7. retirar pela RPC;
8. confirmar histórico `withdrawn` retido por política e cleanup exato.

Até essa sequência, localização deve permanecer `404`/desligada. Nenhuma chave foi registrada em Git, relatório, artifact ou variável pública.
