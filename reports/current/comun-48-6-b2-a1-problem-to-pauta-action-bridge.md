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

## B2-A1 — Rollout Production e fechamento

O estado acima foi fechado pelo rollout controlado posterior, sem alteração
do contrato funcional:

- `origin/main` no início da promoção era `f0f1fcb9271c5dfa87b6e4b191e49a50a4e07710`, resultado da integração da correção operacional PR #410; a implementação funcional permaneceu no merge da PR #408 (`191bc3eea88bf51b6a55c696b5438bf1081b8130`) e a ponte operacional anterior no merge da PR #409 (`1c6cb58ec310000ce581c5e0a121cbc14a48af74`);
- o primeiro preflight, run `33028253307`, foi bloqueado corretamente porque a API de metadados Vercel não entrega o valor descriptografado de envs `encrypted`; o runner lia esse campo como `OTHER` e parava antes de qualquer write. A correção na PR #410 passou a obter o valor somente pelo `vercel env pull` temporário, com limpeza e saída sanitizada; nenhum segredo foi persistido no artefato;
- a correção foi validada no novo SHA com COMUN CI `33028549567`, COST-02/Preview exato e RETRO verdes, e então mergeada na PR #410 sem alteração de produto;
- o preflight remoto metadata/read-only no run `33028873990` confirmou a identidade do `main`, as invariantes A3/A4, o mapa ausente/OFF, `projectionRows=0`, `confirmationRows=0`, `businessWrites=0` e `envWrites=0`. O plano continha exatamente uma migration: `20260826150000_comun_denuncias_public_evidence_pauta_bridge.sql`;
- a promoção controlada no run `33028969613` aplicou exclusivamente essa migration. A exceção externa de Calçadas permaneceu fora do plano; não houve `include-all`, repair, reset, seed, fixture ou envio externo. O artefato de rollout foi o `comun-48-6-b2-a1-production-33028969613`, ID `9629457428`, com digest SHA-256 `1c36b2628b9a3940d64608d36236724774c7aeda22852070d8f413da9bb70322`;
- o postflight confirmou a migration B2-A1 uma única vez, o RPC com os ramos Panorama e Denúncias, execução `service_role` exclusiva, `anon=false`, `authenticated=false`, `projectionRows=0`, `confirmationRows=0`, `businessWrites=0`, `schemaWrites=1_migration_only`, `envWrites=0` e `publicMapProduction=false`;
- as envs A3 e A4 permaneceram únicas, `encrypted`, Production-only e efetivamente `ON`; `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED` permaneceu ausente. Os smokes read-only canônicos permaneceram verdes, incluindo `/comun/denuncias`, `/comun/relatar`, `/comun/pautas`, `/comun/pautas/nova` e detalhe desconhecido cloaked em 404;
- não houve criação automática de Pauta ou Ação, publicação, Search write, coleção, projeção ou confirmação. `automaticPautaCreation=false`, `automaticCollectiveActionCreation=false`, `automaticOfficialSend=false`.

Terminal do rollout:

`COMUN_48_6_B2_A1_COLLECTIVE_PROBLEM_TO_PAUTA_ACTION_BRIDGE_GREEN_MAP_OFF`

Resultado: `ProductionSchemaWrites=1_migration_only`, `ProductionBusinessWrites=0`,
`ProductionEnvWrites=0`, `projectionRows=0`, `confirmationRows=0`,
`publicMapProduction=false`, A3/A4/A5/A0/B0/B1/B2-A0 preservados. B2-A2 não foi
iniciado.
