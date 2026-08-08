# COMUN 48.1B-P3B — cleanup

Status: pendente da lane CI e do smoke sintético Production.

O cleanup deverá operar apenas por IDs exatos da fixture, retirar localização pela API antes de qualquer remoção de dados de teste e provar:

- nenhum objeto público;
- nenhum ciphertext ou coordenada em artifact;
- histórico de localização retirado preservado conforme retenção;
- zero carteira/relato sintético residual quando a política do ambiente permitir a remoção da fixture;
- nenhum dado legítimo alterado.

Não usar SQL manual em Production para apagar histórico append-only.
