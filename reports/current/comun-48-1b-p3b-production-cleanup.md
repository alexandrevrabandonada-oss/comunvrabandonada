# COMUN 48.1B-P3B — cleanup

Status: candidata identificada exatamente uma vez; mutação ainda bloqueada aguardando autorização vinculada ao fingerprint.

Identificação read-only (workflow `31231647886`):

- resultado: `COMUN_P3B_ORPHAN_FIXTURE_IDENTIFIED_EXACTLY_ONE`;
- categoria: `sidewalk_accessibility`;
- minuto sanitizado: `2026-08-08T00:28Z`;
- `candidateCount=1`, `activeLocationCount=1`;
- texto: somente SHA-256 e comprimento (`68`), nunca o conteúdo;
- carteira: um item, nenhum vínculo de conta;
- anexos: zero;
- snapshot público, coletivo e forwarding: zero;
- fingerprint: `8ca45163ecef27c671f68313673d567f512e5a95e8945e16c0a72d6ba0bc7c06`.

Nenhuma escrita foi executada. O modo `cleanup` exige a autorização exata
`AUTORIZO_P3B_SYNTHETIC_CLEANUP_<fingerprint>` e reidentifica a fixture dentro
da própria transação antes de qualquer alteração.

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
