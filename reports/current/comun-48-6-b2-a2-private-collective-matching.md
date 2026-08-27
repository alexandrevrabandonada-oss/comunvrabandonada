# COMUN 48.6-B2-A2 — Agrupamento coletivo privado determinístico

## Estado desta entrega

- Parent/main auditado: `7d9ec53a3e92b81a7c212eb121558924a2bbf3e9`.
- Branch: `codex/48-6-b2-a2-private-collective-matching`.
- Implementação em revisão; migration Production ainda não aplicada.
- `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED`: preservada OFF/ausente.
- `projectionRows=0`, `confirmationRows=0`; nenhum dado de Production foi usado como fixture ou alvo de matching.

## Decisão arquitetural

O B2-A2 reutiliza `comun_relata_collective_cases`, `comun_relata_case_memberships`, `private.comun_relata_case_match_keys` e `comun_relata_case_match_events` criados pelo B0. Não há nova tabela, fila, ontologia, modelo de caso ou matcher. O algoritmo permanece `relata-match-v1`, derivado por `deriveComunRelataMatchPlan()` e baseado apenas em categoria, janela temporal e chaves espaciais HMAC calculadas server-side.

A autoridade é wallet-owned: o cliente informa somente `walletItemId`; o servidor resolve wallet → wallet item → caso/relato e valida localização privada, consentimento B1 ativo, categoria allowlisted e estado do relato. Case IDs, report IDs, membership IDs, collective IDs, texto, identidade, protocolos e localização não são autoridade nem DTO.

## Contrato

O matcher Production é limitado a `public_lighting`, `power_distribution` e `smoke_or_environmental_trace`, com consentimento explícito `relata-public-projection-v1 / collective_projection`. A associação automática só aceita `auto_link_high_confidence`; medium/low confidence não são vinculados. Um seed B1 é reconciliado, nunca duplicado. A operação usa locks transacionais e é idempotente.

Revogação do opt-in e retirada do relato compartilham a primitive de unlink: memberships e chaves ficam inativos, o contador é recalculado e coletivo vazio fica inativo, sem apagar histórico de eventos. A retirada preserva a autoridade existente de receipt e o contrato de auditoria.

O painel da Carteira expõe apenas `waiting` ou `matched`. `matched` significa relação privada entre relatos compatíveis; não significa confirmação causal, publicação, Pauta, Ação ou resposta institucional.

## Arquivos

- `supabase/migrations/20260827120000_comun_denuncias_private_collective_matching.sql`: RPCs server-only, unlink/reconciliação e grants estreitos; nenhuma tabela nova.
- `scripts/comun-denuncias-b2-a2-disposable.sql`: prova descartável A/B/C, janelas de energia, categorias bloqueadas, fronteiras espaciais, idempotência, revogação, retirada e cleanup transacional.
- `.github/workflows/comun-48-6-b2-a2-disposable.yml`: Supabase local descartável no runner; não usa Production, `SUPABASE_DB_URL` ou migration local histórica.
- `scripts/run-48-6-b2-a2-production.sh` e `.github/workflows/comun-48-6-b2-a2-production.yml`: preflight exact-main, SHA, exceção externa de Calçadas, plano de uma única migration, postflight read-only, flag coletiva isolada e smoke GET/HEAD.
- `scripts/48-6-b2-a2-contract.node-test.mjs`: contratos de escopo, ownership, no-leak e rollout.
- `app/api/comun/relata/evidence/grouping/route.ts`: API holder-only wallet-owned.
- `app/comun/minha-participacao/public-projection-consent-panel.tsx`: sinal humano mínimo de waiting/matched após opt-in.

## Boundaries preservados

- `COMUN_RELATA_COLLECTIVE_ENABLED` é a única flag que o rollout pode habilitar, somente após schema/postflight GREEN; A3 e A4 permanecem ON/encrypted/Production-only.
- Mapa público, projeções e confirmações permanecem OFF/zero.
- Não há recompute de projeção, publicação, Search, coleção, Pauta, Ação ou envio oficial.
- `future_map_eligibility` não é alterado.
- Música, emergências, saúde, educação, proteção infantil, workplace, `other`, categorias sensíveis e riscos de retaliação permanecem fora do auto-match.

## Verificação

- `npm run test:b2-a2:contract`: GREEN, 6/6.
- `npm run test:unit`: GREEN, 1.282/1.282 testes, 229 arquivos.
- `npm run typecheck`: GREEN.
- `npm run lint`: GREEN.
- `npm run build`: GREEN; rotas B2-A2 compiladas.
- `node --check scripts/48-6-b2-a2-contract.node-test.mjs`: GREEN.
- `git diff --check`: GREEN.
- Prova Supabase descartável: executada pelo workflow CI; não foi alegada localmente porque o daemon Docker desta máquina estava indisponível.
- Production rollout: pendente de merge, preflight e plano exato; nenhuma escrita remota realizada nesta etapa.

## Terminal de implementação

`COMUN_48_6_B2_A2_PRIVATE_COLLECTIVE_MATCHING_IMPLEMENTED_MAP_OFF_AWAITING_DISPOSABLE_CI`

O terminal funcional só poderá ser declarado depois da prova Supabase descartável GREEN, gates remotos, rollout de schema controlado e postflight read-only. Nenhuma etapa B2-A3 foi iniciada.

## Bloqueio de preflight Production — chave HMAC espacial não pronta

O código e a prova descartável foram integrados no PR #412 e o ajuste
operacional de binding Vercel foi integrado no PR #414 (`a264c4aabd71dfcf65cf25f7b5403d60105705e5`). O preflight Production foi
disparado contra esse SHA exato no run `33090800027`.

O runner confirmou o projeto Vercel canônico, o SHA exato, A3/A4 ON em
Production-only, mapa OFF/ausente e collective sem drift. Em seguida, a
validação sanitizada das chaves server-side falhou porque
`COMUN_RELATA_LOCATION_ENCRYPTION_KEY` e/ou
`COMUN_RELATA_SPATIAL_HMAC_KEY` não ficaram disponíveis em formato base64url
de 32 bytes no ambiente de runtime. O valor nunca foi registrado.

Esse é o terminal fail-closed previsto:

`COMUN_48_6_B2_A2_BLOCKED_SPATIAL_HMAC_KEY_NOT_READY`

Não houve conexão/consulta mutável ao Supabase, aplicação de migration,
escrita de env, deployment, fixture, matching ou outro business write. A
migration `20260827120000_comun_denuncias_private_collective_matching.sql`
permanece pending e o mapa continua OFF. A próxima tentativa só é segura
após provisionamento operacional das duas chaves distintas pelo canal de
segredos já autorizado; nenhum segredo deve ser criado no Git, no relatório
ou no código.
