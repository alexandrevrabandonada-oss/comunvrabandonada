# COMUN 48.6-B0 — Projeção coletiva pública sanitizada

## A0 B0 — Fechamento pós-merge e Production

- Parent/main de entrada: `d0da1bbfd75f7705890a5bb9a0dfb242b275ddb2`.
- PR #402 foi integrada; `origin/main` final e o runtime validado estão em `eb9cca290986332613044243d98a91c6843d34ba`.
- Prova descartável Supabase: run `32923817061`, GREEN; confirmou o contrato, idempotência, concorrência, retirada, RLS/grants e limpeza sem projeção real (`projectionRows=0`, `confirmationRows=0`).
- Preflight remoto metadata-only: run `32923817049`, GREEN; nenhum conteúdo privado foi lido.
- Migration aplicada em Production: `20260826090000_comun_denuncias_public_collective_projection.sql`, uma única vez, pelo run `32926957445`; SHA-256 do arquivo do main: `590fba97f44f549588b8e97b2dc88fc80a83844f4`.
- O plano remoto foi exatamente a migration B0. Não foram usados `--include-all`, migration repair, reset ou seed.
- Postflight Production: `migrationCount=1`, collective/projection/consent schema presentes, RLS e FORCE RLS ativos, `anon`/`authenticated` fechados e acesso operacional restrito a RPCs de service role.
- Deployment Production `6096559166` ficou SUCCESS/READY no SHA final. O mapa permaneceu OFF: `/comun/denuncias/mapa` e sua API retornam 404/cloak, enquanto `/comun/denuncias` e `/comun/relatar` retornam 200 em GET/HEAD.
- Estado pós-rollout: `projectionRows=0`, `confirmationRows=0`, `confirmationCount=0`, `businessWrites=0`, `schemaWrites=1_migration_only`, `envWrites=0`, `backfill=false`, sem fixtures, publicações, Search, assets ou coleções.
- Smoke HTML não encontrou marcadores privados; nenhuma env foi alterada e `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED` permanece ausente/OFF.
- A0–A3 continuam preservados: `autoOfficialSend=false`, `publicGeneralMap=false`, `publicCollectiveGrouping=false`, sem confirmação pública Production.
- O Quality Performance pós-merge `32926934090` falhou somente em um teste por `Chromium headless ... signal 11 SEGV_MAPERR` após 29 testes passarem; foi classificado como falha de infraestrutura do runner, não como falha determinística do B0, e não houve rerun repetitivo.

**Terminal:** `COMUN_48_6_B0_SCHEMA_GREEN_MAP_OFF_NO_PROJECTION`

## Estado da execução

- Parent/main confirmado em `d0da1bbfd75f7705890a5bb9a0dfb242b275ddb2`.
- Branch de trabalho: `codex/48-6-b0-public-collective-projection`.
- PR de integração em uso: #402 (sem nova branch ou nova PR).
- Data da revisão: 2026-08-25.
- Estado: fundação em validação; migration Production ainda não aplicada; mapa Production OFF.
- `autoOfficialSend=false`, `publicProjection=false`, `publicGeneralMap=false`, `publicCollectiveGrouping=false`.

## Diagnóstico factual e arquitetura reutilizada

O fluxo existente é:

`CAPTURA → CLASSIFICAÇÃO → ROTEAMENTO → CANAL → ENVIO/DECLARAÇÃO → PROTOCOLO → RESPOSTA → RESULTADO → MEMÓRIA COLETIVA`.

O B0 não criou uma segunda denúncia, case, wallet, fila, forwarding engine ou protocolo. A captura continua em `/comun/relatar`, com Quick Capture, `comun_reports`, classificação Relata, localização privada, anexos privados e Carteira de Participação. A1 continua responsável por packages/attempts e canais assistidos; `prepared` continua diferente de `sent`; A3 continua responsável por protocolo oficial, resposta e escalada.

O protótipo de mapa em `supabase/local-migrations/20260803200000_comun_relata_sanitized_local_map.sql`, `lib/comun-relata-public-projection.ts`, `/comun/relata/mapa` e `/api/comun/relata/public/*` permanece laboratório local. Ele não foi renomeado, movido ou promovido. A rota antiga continua compatibilidade do laboratório, não é a porta pública canônica do B0.

## Preflight Production metadata-only

O workflow read-only `COMUN 48.6-B0 remote preflight` foi executado no run `32918355042`, job `98026686732`, com artefato sanitizado. Nenhuma linha de negócio, texto, contato, endereço, coordenada, anexo, protocolo ou resposta foi lida; `businessContentRead=false`.

Resultado relevante:

- migration local de mapa 48.0D ausente do histórico remoto;
- tabelas/funções do mapa local ausentes em Production;
- `public.comun_relata_collective_cases` e `public.comun_relata_case_memberships` ausentes em Production;
- `private.comun_relata_private_locations`, `public.comun_relata_evidence_consents` e `public.comun_relata_public_snapshots` presentes;
- snapshot histórico continua estruturalmente fechado, com RLS forced e estado de publicação bloqueado;
- grants de cliente não foram encontrados nas raízes relevantes; privilégios service-role existentes foram apenas inventariados;
- não houve drift inesperado que justificasse interromper o desenho.

Conclusão: é necessário um schema Production novo e estreito para o substrato coletivo e a fronteira de projeção. Não é seguro reutilizar a migration local nem mascarar o fato de que o coletivo ainda não existe remotamente.

## Modelo e consentimento

`public.comun_relata_collective_cases` é o substrato coletivo canônico do B0, relacionado por `public.comun_relata_case_memberships` aos casos Relata individuais. Match keys ficam no schema privado e eventos de match são append-only. Não existe um `public_problem_groups`, `map_cases` ou equivalente paralelo.

Consentimento de encaminhamento, localização, participação ou rede externa não é consentimento de mapa. O novo `private.comun_relata_public_projection_consents` exige declaração explícita, versão `relata-public-projection-v1` e escopo `collective_projection`. Apenas memberships ativos, não retirados, com consentimento individual ativo e categoria allowlisted podem contar numa futura recomputação. Não há backfill e a migration não insere registros.

História de retirada é tratada fail-closed: o primitive futuro recalcula a contagem e suprime uma projeção existente quando o mínimo deixa de ser atendido. O teste descartável exerce essa passagem; nenhuma projeção real é criada em Production.

## Política inicial de projeção

Allowlist fechada neste tijolo:

| Categoria | Grade | Mínimo |
|---|---:|---:|
| `public_lighting` | 300 m | 1 |
| `power_distribution` | 800 m | 2 |
| `smoke_or_environmental_trace` | 1.000 m | 1 |

Saúde, educação, proteção infantil, trabalho, emergência, fogo ativo, risco elétrico, acusações individualizadas, violência, retaliação, classes sensíveis/restricted/high-risk e `other` permanecem bloqueados. Saúde e educação não são convertidas em pontos espaciais neste B0.

O público recebe somente `public_id` opaco, categoria templated, contagens de memberships elegíveis, datas em precisão de dia, centro aproximado da célula e raio de incerteza. Não recebe case/report/membership ID, texto, protocolo, pessoa, endereço, coordenada exata, hash, HMAC, ciphertext, foto ou status oficial. A precisão é monotônica: uma atualização não reduz a incerteza.

## Schema Production proposto

Migration nova: `supabase/migrations/20260826090000_comun_denuncias_public_collective_projection.sql`.

Ela:

- verifica raízes Relata existentes e falha fechado diante do protótipo local ou de schema coletivo parcial;
- cria somente as estruturas necessárias para cases coletivos, memberships, match keys/events, consentimento explícito, candidatos espaciais, projeções sanitizadas e ledgers append-only;
- mantém tabelas de confirmação apenas preparadas para capacidade futura; B0 não expõe CTA nem aceita confirmação Production;
- cria primitives service-role-only para definir candidato e recomputar uma projeção futura, com lock, idempotência, allowlist, mínimo, consentimento, candidato espacial e supressão após retirada;
- cria RPCs públicos de leitura atrás de trusted server/service-role; clientes não recebem grants diretos;
- habilita e força RLS nas tabelas novas; preserva privilégios do schema privado já existente e limita novos grants service-role ao necessário;
- não toca `public.comun_relata_public_snapshots`, Storage, Search, coleções, relações territoriais, publicação ou dados de negócio;
- não faz backfill, seed, fixture ou projeção.

Checksum SHA-256 do arquivo no estado candidato: `ED54C45BA2698D73C7045870CF32A77D7D96ED6D302F87B9489CB6FE7ACB8CBB`.

## Runtime, API e UI

Foi criada a fronteira separada `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED`, cumulativa com persistência, localização, coletivo, HTTPS e chave server-only. Ausente/desligada, a página `/comun/denuncias/mapa` e a API correspondente ficam 404/cloaked; nenhuma flag do laboratório é reinterpretada.

Quando houver rollout posterior, a UI será lista-first em `/comun/denuncias/mapa`, com copy sanitizada e sem renderer CSS que simule cartografia. O componente não usa o `ComunRelataLocalMap`. A API só expõe GET, usa no-store/noindex e faz sanitização server-side. O B0 não ativa a flag, não executa RPC de projeção e não cria deployment por alteração de env.

## Verificações

- `node scripts/48-6-b0-contract.node-test.mjs`: 3/3 GREEN.
- `git diff --check`: GREEN.
- checksum e presença da migration local histórica auditados.
- preflight Production metadata-only: GREEN, run `32918355042`.
- prova Supabase descartável completa: definida no workflow `.github/workflows/comun-48-6-b0-disposable.yml`; aguardando execução remota no head final.
- `npm run typecheck` e `npm run lint` locais não puderam ser executados porque o clone de verificação não possui `node_modules`; a instalação local foi impedida pelo erro TLS `UNABLE_TO_VERIFY_LEAF_SIGNATURE` ao resolver o CLI, sem alteração de certificados ou bypass de segurança. Os gates proporcionais seguem para CI.

## Limites e próximo gate

O mapa continua OFF e `projectionRows=0` em Production. Antes de qualquer promoção, CI deve comprovar migration em banco descartável, grants/RLS, consentimento explícito, idempotência, supressão por retirada, ausência de linhas iniciais e nenhum acesso cliente. A promoção remota futura deverá aceitar somente o plano exato da migration B0, sem `--include-all`, repair, reset, seed ou fixture.

Este tijolo não inicia confirmações públicas, agrupamento público, auto-send, mapa geral, A5, A4B ou qualquer outra capacidade.
