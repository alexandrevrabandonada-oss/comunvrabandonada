# COMUN 48.1B-P3B — cleanup

Status: bloqueado; a lane CI está verde, mas o cleanup da fixture Production não foi comprovado.

O primeiro ensaio remoto foi criado com texto sintético de calçada e coordenada fixa. A execução foi interrompida antes da retirada por uma asserção de campo de resposta incorreta (`hasPrivateLocation` em vez do estado canônico `location`). A resposta não continha latitude nem longitude.

Tentativa de recuperação por deployment staged temporário foi encerrada sem escrita porque o cliente REST server-side não pôde ler o schema `private`; o endpoint temporário foi removido antes do deploy canônico. O MCP retornou `permission denied` para consulta read-only.

O cleanup deverá operar apenas por IDs exatos da fixture, retirar localização pela API antes de qualquer remoção de dados de teste e provar:

- nenhum objeto público;
- nenhum ciphertext ou coordenada em artifact;
- histórico de localização retirado preservado conforme retenção;
- zero carteira/relato sintético residual quando a política do ambiente permitir a remoção da fixture;
- nenhum dado legítimo alterado.

Não usar SQL manual em Production para apagar histórico append-only. Reabrir a ativação somente com uma capacidade server-side auditada que consiga localizar a fixture por escopo exato e retirar o relato/localização sem tocar em dados legítimos.

Resultado: `COMUN_P3B_BLOCKED_SYNTHETIC_CLEANUP_UNPROVEN`.
