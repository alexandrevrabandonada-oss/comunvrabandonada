# COMUN 48.6-B2-A1 — Problema coletivo → Pauta viva → Ação

## Estado

`COMUN_48_6_B2_A1_COLLECTIVE_PROBLEM_TO_PAUTA_ACTION_BRIDGE_GREEN_MAP_OFF`

- Parent/main: `cc0e632556ecf9952bbe7307fd6bd161ada71425`.
- Branch: `codex/48-6-b2-a1-problem-pauta-action`.
- Migration única: `20260826150000_comun_denuncias_public_evidence_pauta_bridge.sql`.
- `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED` permanece OFF/ausente.

## Diagnóstico e reconciliação

O COMUN já possuía uma única infraestrutura de Pautas, evidência pública e
Ações coletivas. O RPC `comun_create_pauta_low_friction_v1` aceitava somente
`comun.panorama`; a projeção sanitizada B0 já possuía os dados públicos para
uma referência `comun.denuncias`, mas ainda não havia ponte versionada.

Não foi criada segunda fila, novo CollectiveCase, novo modelo de denúncia,
novo motor de encaminhamento ou nova tabela. `comun_relata_collective_cases`
e memberships continuam privados. A ponte usa somente o DTO sanitizado de
`comun_denuncias_public_get`; Report, Case, Membership, localização privada,
protocolos e texto original não entram na referência.

Pautas relacionadas reutilizam `comun_pauta_evidence_items`, exigindo
evidência pública aprovada, versão atual, Pauta pública e não arquivada.
Ações relacionadas reutilizam `listPublicCollectiveActionsByPauta`/`pauta_id`.
Nenhuma Pauta ou Ação é criada automaticamente.

## Contrato público

`PublicEvidenceCitationV1` é agora uma união discriminada: Panorama mantém
serialização e hash; Denúncias usa `denuncias:<UUID>`,
`community_observation`, `reviewed_community_projection`, política
`relata-public-projection-v1`, contagem/datas sanitizadas e raio de incerteza.
`sourceRefs` é vazio. O versionamento usa somente campos semânticos públicos.

A validação rejeita IDs privados, localização exata, protocolos, respostas,
storage, hashes, contatos e marcadores equivalentes. Com a flag OFF,
`denuncias:*` resolve para `null` e o detalhe retorna 404/cloak; estados
suprimidos, inativos ou retirados não são citáveis.

## Superfície

`/comun/denuncias/problemas/[publicId]` mostra título/resumo templated,
contagem elegível, datas e área aproximada. Seus CTAs levam ao Relata com
apenas a categoria segura ou a `/comun/pautas/nova` com apenas a referência
opaca. A pergunta da Pauta continua em branco e obrigatória.

O inventário corrente foi atualizado conscientemente de 228 para 229 páginas;
históricos não foram alterados. A superfície permanece cloaked enquanto o
mapa estiver OFF.

## Schema e rollout

A migration é `create or replace function` do RPC existente, sem tabela,
coluna, trigger ou mudança de RLS. Preserva assinatura, locks, idempotência,
limites, grants service-role-only e validação Panorama, acrescentando somente
a ramificação Denúncias estrita. A exceção externa de Calçadas permanece fora
do plano. Nenhum `db push`, reset, seed, repair, Supabase remoto, env write ou
fixture Production foi executado.

## Verificação local

- testes focais: GREEN;
- `npm run experience:coherence:test`: GREEN (`totalPages=229`, `missingRequiredRoutes=0`);
- `npm run test:unit`: GREEN (229 arquivos, 1.282 testes);
- `npm run typecheck`: GREEN;
- `npm run lint`: GREEN;
- `npm run build`: GREEN;
- `git diff --check`: GREEN;
- `automationAllowed=false`, `prepared != sent` e protocolo COMUN distinto do oficial preservados;
- `publicMapProduction=false`, `projectionRows=0`, `confirmationRows=0`;
- `ProductionBusinessWrites=0`, `ProductionSchemaWrites=0` antes do rollout, `ProductionEnvWrites=0`;
- publications=0, SearchWrites=0, collectionWrites=0; A3/A4/A5 preservados.

## Limite

Após o checkpoint e gates remotos, esta única migration poderá ser promovida
pelo pipeline canônico. O postflight deve manter mapa OFF, projeções e
confirmações em zero. B2-A2 não foi iniciado.
