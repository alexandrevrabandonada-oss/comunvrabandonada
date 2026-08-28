# COMUN 48.6-B2-A2 — Agrupamento coletivo privado determinístico

## Estado final — R7

- Main final: `8926a78080aeae9ebca7fdbe3df3f83f19a83e2f` (merge da PR #422).
- A migration `20260827120000_comun_denuncias_private_collective_matching.sql` foi aplicada exatamente uma vez pelo rollout R6; o postflight R7 confirmou `migrationCount=1` em transação read-only.
- `COMUN_RELATA_LOCATION_ENABLED` e `COMUN_RELATA_COLLECTIVE_ENABLED` estão ON, canônicas e Production-only. A chave de localização permanece `sensitive` e preservada; a chave espacial permanece `sensitive`, provisionada no R5, sem readback.
- O smoke canônico sem cookie nem carteira retornou `401 {"code":"wallet_authority_required"}`. Assim, feature fechada continua distinta de falta de autoridade, sem revelar posse ou existência de item.
- `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED` permanece ausente/OFF; `projectionRows=0`, `confirmationRows=0`. Nenhum relato, opt-in, associação real, Pauta, Ação ou envio oficial foi criado.

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

## Verificação final

- R6 preflight `33188064971`, promote `33188221233` e postflight independente `33188568844`: GREEN no main `d56412929053ae288082c0a9db29ee633503af7c`.
- R7: PR #422 validada no checkpoint `259aace3b276ac73e153b8baf04dabc30f2f1ec4`; 26 checks remotos success e 74 não aplicáveis skipped; merge `8926a78080aeae9ebca7fdbe3df3f83f19a83e2f`.
- Testes locais R7: rota holder-only, contrato B2-A2, `test:unit` (1.287), typecheck, lint, build, experiência, jornadas, superfícies, segurança, qualidade, Civic Intelligence e Civic Graph: GREEN.
- Smoke Production R7: grouping sem carteira `401 wallet_authority_required`; `/comun/denuncias`, `/comun/relatar` e `/comun/minha-participacao` retornaram 200; mapa e API pública do mapa retornaram 404/cloak.
- Postflight R7 `33196364701`: GREEN/read-only, com RLS/FORCE RLS, grants service-role-only e zero projeções/confirmações.

## Terminal final

`COMUN_48_6_B2_A2_PRIVATE_COLLECTIVE_MATCHING_GREEN_MAP_OFF`

O próximo limite é B2-A3, zero-code por padrão. Ele não foi iniciado.

## Histórico — bloqueio inicial de preflight por chave HMAC espacial

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

## R5 — contrato `sensitive` e provisionamento write-only da chave espacial

- Parent/main de entrada: `d97b225d4e731c4987e365c595a66363c7f058f6`; PR #418 foi mergeada e o novo main passou a `cf0130cba52c8a027c2903b002f038c782f5897a`.
- O diagnóstico R4 corrigido foi executado contra esse main no run `33171352318`: location key canônica `sensitive`, Production-only, project-level; spatial key ausente; `productionWrites=0`; sanitizer Node realmente executado.
- A primeira execução R5 (`33171402245`) gerou e provisionou uma única chave espacial aleatória de 32 bytes, `sensitive`, Production-only, sem readback. O workflow falhou somente no caminho interno do `postcheck.json`; o artifact confirmou o write sem conter o valor.
- As correções mínimas foram mergeadas nos PRs #419 e #420. As reruns encontraram a chave existente e não fizeram novo write; o sanitizer também bloqueou corretamente um artifact incompleto antes da correção final.
- A execução final foi o run `33172112649`, contra o main `f2116b63045df3453de689a3eea52a6447217df4`, e fechou GREEN com postcheck, deploy Production e smokes. O artifact confirma location `sensitive` preservada e não escrita; spatial `sensitive` Production-only com proveniência R5; `secretReadback=false`; sanitizer executado; schema/business writes `0` nessa reconciliação. O total do R5 foi exatamente `ProductionEnvWrites=1`, exclusivamente para a spatial key.
- `B2A2MigrationCount=0`, `COMUN_RELATA_COLLECTIVE_ENABLED` permanece OFF, `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED` permanece OFF/ausente, `projectionRows=0`, `confirmationRows=0`, nenhum matcher real foi executado e nenhum envio oficial ocorreu. A location key não foi lida, rotacionada ou recriada.

Terminal R5: `COMUN_48_6_B2_A2_R5_SPATIAL_SENSITIVE_KEY_PROVISIONED_READY_FOR_PREFLIGHT`.
