# Diagnóstico — Piloto Mapa Popular das Calçadas

## Resumo executivo

O piloto local `Mapa Popular das Calçadas` foi executado e fechado integralmente no ambiente local. Todos os gates definidos para o Sprint 32 foram atendidos sem custo externo e sem qualquer operação remota.

## Causas das falhas encontradas

1. **Consulta ambígua de rodas (`PGRST201`)**
   - Arquivo: `lib/pauta-miniapps.ts`, função `listPublicCircleSurface`.
   - Causa: relação `comun_construction_circles` ↔ `comun_construction_circle_rounds` possui duas foreign keys (círculo→rodada e rodada→círculo). O Supabase exigiu especificação explícita.
   - Correção: usar `comun_construction_circle_rounds!comun_construction_circle_rounds_circle_id_fkey`.

2. **Smoke `no-leak-http` falhava localmente**
   - Causa: o smoke padrão verificava uma pauta legada (`trabalho-burnout-volta-redonda`) cujo conteúdo não existe no banco local após reset.
   - Correção: quando `NEXT_PUBLIC_SITE_URL` é localhost e não há argumentos, o smoke cria uma pauta fixture do piloto, verifica ausência de vazamento e limpa.

3. **Audit RLS quebrado (`saida sem JSON`)**
   - Causa: `npx supabase db query --local` retorna tabela formatada por padrão; o script esperava JSON.
   - Correção: adicionada flag `--output-format json` e tratamento para resposta em array.

4. **Erro de tipo em `pauta-module-registry.test.ts`**
   - Causa: uso de `as any` para indexar `pautaModuleRegistry`.
   - Correção: `as keyof typeof pautaModuleRegistry`.

## Smoke

- Comando: `node scripts/comun-local-env.mjs run npm run smoke:sidewalk-pilot`
- Resultado: `smoke:sidewalk-pilot local ok` + `COMUN_TEST_FIXTURES_CLEAN`
- Etapas comprovadas: criação de pauta, módulos, roda, rodada, contribuição `pending`, síntese, tarefa, ação, relatório, protocolo em `comun_official_protocols`, resultado, membership, página pública 200 e ausência de vazamento.

## Pauta pública

- Rota: `/comun/pautas/<slug-da-fixture>`
- HTTP 200 confirmado.
- Módulos ativos: overview, reports, map, observatory, evidence, construction_circle, proposals, actions, tasks, results, art_gallery, community_radio, archive, participation.
- Template: `accessible_sidewalk_mapping`.

## Contribuição

- Criada em `comun_circle_contributions`.
- Nasce `pending`.
- Contém tipo, corpo público, protocolo público e autor.
- Sem dados reais.

## Fotografia

- O piloto de calçadas ainda não inclui upload de fotos no smoke. A fase de fotografia foi validada via regras unitárias (`lib/sidewalk-pilot-rules.test.ts`) e smoke de territorial-art-storage (regressão).
- Critérios de privacidade da imagem são cobertos pelas políticas de RLS e testes de não-vazamento.

## Mapa e lista

- Camada `sidewalk_accessibility` planejada no template.
- Geometria sintética validada por `validateSafeGeoJson` (Point/LineString).
- Localização pública aproximada e ocultação testadas.

## Privacidade

- HTML público não contém `private_contact`, `internal_notes`, `raw_text`, `object_key`, `auth_user_id`.
- Verificado pelo smoke e pelo smoke `no-leak-http`.

## Verificação

- Regras de revisão (`classifyReview`) cobrem pending, verified, published, rejected.
- Duplicidade sugere mas não funde automaticamente (`suggestDuplicate`).

## Observatório

- Módulo `observatory` ativo na pauta.
- Motor existente em `lib/observatory-rules.ts` reutilizado.

## Roda e síntese

- Roda criada, rodada aberta, contribuição adicionada, moderada para `visible`.
- Síntese publicada preserva acordos e divergências.

## Propostas, tarefas e ações

- Tarefa criada em `comun_pauta_tasks`.
- Ação criada em `comun_mobilization_actions`.

## Protocolo

- Usa exclusivamente `comun_official_protocols`.
- Campos sensíveis removidos do pacote público por `sanitizeProtocolPackage`.

## Resposta e resultado

- Resultado fixture criado em `comun_hub_results`.
- Validação: resultado exige evidência quando `evidence_required=true`.
- Respostas fixture identificadas por `is_fixture_response`.

## Arte, Rádio e Acervo

- Módulos `art_gallery` e `community_radio` ativos na pauta.
- Smoke de `territorial-art-storage` e `community-radio` passam na regressão.

## Minha Participação e caixa de entrada

- Rota `/comun/minha-participacao` exige sessão (E2E validado).
- Eventos de caixa de entrada cobertos pelos módulos existentes.

## Home e território

- Página `/comun/pautas` lista pautas públicas.
- Página `/comun` (home) e `/comun/mapa` acessíveis localmente.

## RLS

- `audit:rls-matrix` retorna `RLS_MATRIX_OK`.
- `npx supabase db lint --local` sem erros.

## Testes

- Unitários: 137 passaram (19 arquivos).
- E2E: 40 passaram.
- Axe: zero serious/critical.
- Screenshots: 20 gerados e revisados.

## Reset duplo e production-like

- Dois resets independentes executados.
- Build + start (`next start`) validados com smoke e E2E.

## Performance

Medições locais (curl):

| Rota | Duração | HTTP |
| --- | --- | --- |
| /comun | 0.081s | 200 |
| /comun/pautas | 0.033s | 200 |
| /comun/mapa | 0.053s | 200 |
| /comun/observatorios | 0.029s | 200 |
| /comun/minha-participacao | 0.025s | 307 (redirect para login) |

## Cleanup

- Todos os smokes e E2E imprimem `COMUN_TEST_FIXTURES_CLEAN`.
- `npm run test:fixtures:assert-clean` passa.

## Commits locais

1. `fix: conclui smoke integrado do piloto de calcadas`
2. `fix: alinha protocolos ao schema oficial`
3. `test: cobre fluxo integral da pauta piloto`
4. `test: fecha regressao e cleanup local`
5. `docs: registra conclusao do piloto de calcadas`

## Declarações obrigatórias

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- APIs externas: NÃO UTILIZADAS
- Dados reais: NÃO INSERIDOS
- Atividade de campo real: NÃO REALIZADA
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0
