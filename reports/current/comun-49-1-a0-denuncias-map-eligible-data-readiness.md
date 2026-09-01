# COMUN 49.1-A0-R1 — Readiness dos dados elegíveis do mapa de denúncias

## Resultado

`COMUN_49_1_A0_R1_DENUNCIAS_MAP_ELIGIBLE_DATA_READINESS_GREEN`

O R1 entrega um diagnóstico determinístico, agregado e fail-closed. Ele não
abre o mapa, não cria projeção, não fabrica consentimento e não muda a flag.
Zero registros elegíveis é um resultado válido e explicável.

## HEAD/base utilizados

- base: `origin/main` em `ac8c41d1d959ea638db116b26d5af71ef55cc272`;
- checkpoint #429 confirmado como ancestral;
- branch: `codex/comun-49-1-denuncias-map-data-readiness`;
- o commit documental R0 `715b97e7c0245a107b43484df0e60b22795203af`
  foi consultado, mas não foi carregado para a branch funcional.

## Contrato de elegibilidade

A cadeia canônica encontrada é:

1. um relato privado, pertencente a uma carteira, possui categoria, estado,
   classe de privacidade e localização privada pronta;
2. o holder concede consentimento explícito
   `relata-public-projection-v1 / collective_projection`;
3. o B1 cria ou reutiliza um seed coletivo privado;
4. o B2-A2 deriva chaves espaciais server-side e só associa automaticamente
   quando há match `auto_link_high_confidence` em categoria allowlisted;
5. revogação do consentimento ou retirada do relato desfaz memberships ativos
   e aciona recompute;
6. um candidate espacial sanitizado precisa respeitar a célula da categoria;
7. `future_map_eligibility` precisa ter sido legitimamente liberado;
8. o RPC de recompute conta apenas memberships ativos, relatos não retirados e
   consentimentos ativos, então materializa/suprime a projeção;
9. somente `projection_state=active` atravessa os RPCs públicos server-only;
10. o sanitizer cria o DTO allowlisted; a página ainda exige flag estrutural e
    pelo menos uma linha pública elegível.

`PUBLIC_MAP_DATA_READY` não foi persistido. Ele é derivado por
`resolveComunDenunciasMapReadiness()` a partir de contagens agregadas e da
política canônica.

## Máquina de estados encontrada

| Etapa           | Entrada e validação                                                                                                                | Saída/persistência                                                                                          | Autoridade e revogação                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| opt-in          | wallet item owned, categoria allowlisted, não emergencial, privacy class pública após sanitização e localização pronta             | consentimento ativo em `private.comun_relata_public_projection_consents`; seed/membership quando necessário | holder via API server-side; holder pode retirar                        |
| matching        | consentimento ativo, wallet ownership, localização privada decryptada apenas no servidor, HMAC espacial, janela e categoria iguais | membership/match key/event; só high confidence auto-linka                                                   | RPC service-role; retirada/consent revoke desativa membership e key    |
| collective real | estado ativo, dois ou mais membros, confiança high e evento `auto_link_high_confidence`                                            | coletivo privado permanece canônico                                                                         | fluxo normal; nenhum fixture Production                                |
| candidate       | coletivo allowlisted e grade/raio válidos                                                                                          | candidate privado de 300/800/1.000 m                                                                        | primitive private service-role; ainda sem rotina automática autorizada |
| recompute       | consentimentos ativos, memberships ativos, mínimos, `future_map_eligibility`, candidate                                            | projeção active/suppressed e evento append-only                                                             | primitive private; retirada/revogação recomputa                        |
| confirmation    | projeção já pública e token anônimo                                                                                                | confirmação/undo e contagem                                                                                 | preparado no B0 legado; não é requisito do recompute canônico atual    |
| leitura         | flag/dependências, RPC server-only, projeção active, policy/cluster válidos                                                        | DTO público sanitizado                                                                                      | GET/no-store/noindex; nenhuma mutation                                 |

Não há expiração temporal do consentimento no contrato atual. Há retirada
explícita. Match keys usam janela temporal na associação, mas memberships e
consentimentos possuem revogação própria.

## Readiness

Contrato: `comun-denuncias-map-readiness-v1`.

Saída segura:

- `mapDataReady`;
- blockers estáveis;
- números agregados de coletivos, consentimentos, confirmações, candidates e
  projeções;
- `confirmationRequiredForPublication=false`, refletindo o RPC real em vez de
  inventar um gate.

Blockers possíveis:

- `FEATURE_DISABLED`;
- `NO_ELIGIBLE_COLLECTIVE`;
- `NO_VALID_CONSENT`;
- `NO_SPATIAL_CANDIDATE`;
- `NO_PUBLIC_PROJECTION`;
- `NO_ALLOWED_CATEGORY`;
- `INVALID_CLUSTER_POLICY`.

O resolver suporta múltiplos blockers e nunca transforma ausência/revogação em
consentimento. Valores inválidos ou negativos são normalizados para zero.

## Blockers atuais

O diagnóstico Production read-only do commit `490d982ae7ddaf168cb5cd9a5decfde99be4a70e`
confirmou, em uma transação read-only, os blockers:

- `FEATURE_DISABLED`;
- `NO_ELIGIBLE_COLLECTIVE`;
- `NO_VALID_CONSENT`;
- `NO_SPATIAL_CANDIDATE`;
- `NO_PUBLIC_PROJECTION`;
- `NO_ALLOWED_CATEGORY`.

`INVALID_CLUSTER_POLICY` não está presente porque não há nenhuma projection row
para validar. O job fixa sua própria leitura de feature como desabilitada para
preservar o cloak; não lê nem altera a env de Production. O estado operacional
da flag permanece OFF conforme a evidência R0.

## Coletivos reais

O diagnóstico conta somente agregados. Um coletivo real exige estado ativo,
dois ou mais membros ativos, confiança high e evento
`auto_link_high_confidence`. Production retornou `realCollectives=0` e
`eligibleCollectives=0`. Nenhuma identidade, UUID, protocolo, texto,
coordenada ou hash é selecionado.

## Consentimento

Consentimento do mapa é explícito, holder-owned, versionado e separado de
localização, evidência, encaminhamento, agrupamento e envio oficial. Ausência de
resposta não concede consentimento. Retirada preserva histórico, desativa o
consentimento, desfaz membership/key e recomputa qualquer projeção existente.

## Confirmação

As tabelas de confirmação e undo existem, mas a confirmação pública não é
requisito de publicação no `comun_relata_public_projection_recompute`. O R1 a
mede como observabilidade e preserva `confirmationRequiredForPublication=false`.
Adicionar `NO_ACTIVE_CONFIRMATION` como blocker seria inventar política.

## Projeção

O candidate é privado. A projeção final contém somente public ID opaco,
categoria, estado comunitário, contagens, datas, centro de célula, raio de
incerteza, policy, razão/estado e timestamps. Apenas projeções `active` são
listadas. O novo gate da page exige pelo menos uma linha que também passe pela
policy/cluster checker antes de renderizar a superfície.

## Categorias allowlisted

- `public_lighting`;
- `power_distribution`;
- `smoke_or_environmental_trace`.

A allowlist existe na migration B0, no DTO/policy TypeScript, na API e no
matcher. Categoria externa continua fail-closed. Emergência, violência, saúde,
educação, proteção infantil, acusação individualizada, retaliação e classes
sensíveis permanecem bloqueadas.

## Política de cluster

- iluminação pública: 300 m;
- distribuição de energia: 800 m, mínimo de dois relatos no recompute;
- vestígio ambiental: 1.000 m.

O candidate exige `grid_meters` exatamente igual à política e raio de incerteza
maior ou igual à grade. O trigger de precisão impede diminuir o raio. O R1
valida os três níveis e marca policy/grade/raio incompatível como
`INVALID_CLUSTER_POLICY`.

## Garantias de privacidade

Testes injetam campos proibidos e comprovam que o DTO não contém:

- latitude/longitude original;
- endereço exato;
- nome, e-mail ou telefone;
- case/user IDs internos;
- protocolo;
- texto livre;
- anexos;
- dados de autenticação.

O diagnóstico SQL seleciona apenas `count(*)`, estados técnicos e política de
cluster em `BEGIN READ ONLY`; não seleciona colunas de identidade, texto,
protocolo, token/hash ou coordenada privada. A saída declara
`piiRead=false`, `privateCoordinatesRead=false` e `businessWrites=0`.

RLS/FORCE RLS e grants server-only existentes não foram alterados.

## Gates humanos removidos

Nenhum gate legítimo foi removido. O que foi automatizado é exclusivamente
técnico e determinístico:

- validação de allowlist;
- validação de policy/grade/raio;
- derivação de blockers;
- inspeção agregada em uma única transação read-only;
- cloak quando não há dado final elegível;
- diagnóstico repetível por workflow.

## Gates humanos obrigatórios preservados

- consentimento explícito do holder;
- eventual decisão crítica de publicação/liberação de
  `future_map_eligibility`;
- revisão futura quando confiança/política exigir;
- qualquer write que crie uma publicação real.

O R1 não altera `future_map_eligibility`, não cria candidate e não chama
recompute em Production.

## Mudanças implementadas

- `lib/comun-denuncias-map-readiness.ts`: resolver puro, policy checker e
  readiness a partir do DTO público;
- `lib/comun-denuncias-map-readiness.test.ts`: zero, múltiplos blockers,
  consentimento ausente/revogado, confirmação não inventada, categoria,
  projeção, READY, clusters e no-leak;
- `lib/server/comun-denuncias-public-map-runtime.ts`: leitura raw server-only e
  readiness final sem expor diagnóstico;
- `app/comun/denuncias/mapa/page.tsx`: mantém o gate da flag e acrescenta
  `notFound()` quando não existe dado final elegível;
- `scripts/diagnose-comun-denuncias-map-readiness.mjs`: diagnóstico agregado,
  read-only e sem PII;
- workflow interno para executar o diagnóstico com binding Production exato;
- nenhuma UI visível, API pública nova, migration ou env.

## Testes

- contrato estático do diagnóstico: 3/3 GREEN;
- resolver/sanitização/feature: 14/14 GREEN;
- cobre flag OFF, readiness false e preservação do `notFound()`.

## Gates locais

- testes focais: GREEN;
- `git diff --check`: GREEN;
- Prettier focal: aplicado com `prettier@3.9.6` já cacheado;
- typecheck/lint/build completos: bloqueados localmente por `ENOSPC` após o
  `node_modules` deste worktree ficar incompleto; serão exigidos no CI remoto
  limpo, sem classificar os falsos erros de módulos ausentes como regressão.

## Gates remotos

- diagnóstico Production read-only: GREEN (workflow run `33563228139`);
- resultado agregado: `mapDataReady=false`, `transactionReadOnly=true`,
  `piiRead=false`, `privateCoordinatesRead=false`, `businessWrites=0`;
- typecheck, lint, build, testes focais e Preview: PENDING neste commit final.

A PR não pode mergear antes desses gates restantes estarem verdes.

## Estado da rota `/comun/denuncias/mapa`

Permanece 404 quando a flag está OFF. Mesmo se a flag for habilitada em outro
ambiente, agora permanece 404 enquanto não houver pelo menos uma projeção
`active` allowlisted, com policy e granularidade válidas. O R1 não cria link de
navegação nem abre a rota.

## Estado real de Production

O workflow Production com binding não local e SHA exato confirmou:

- `realCollectives=0`;
- `eligibleCollectives=0`;
- `activeConsents=0`;
- `activeConfirmations=0`;
- `spatialCandidates=0`;
- `projectionRows=0`;
- `activeProjectionRows=0`;
- `allowedCategoryRows=0`;
- `eligibleRows=0`;
- `invalidClusterPolicyRows=0`.

Não houve schema write, env write, business write, migration, flag change ou
deploy manual. A ausência de dados reais elegíveis mantém o mapa fechado como
previsto.

## Próximo tijolo recomendado

Se o diagnóstico continuar sem coletivo real consentido:

`COMUN_49_1_A0_R2_DENUNCIAS_FIRST_ELIGIBLE_COLLECTIVE_FLOW`

O objetivo deve ser adoção real pelo fluxo normal, não fixture ou SQL. Candidate,
liberação de elegibilidade e publicação permanecem tijolos posteriores e
críticos. Não recomendar cartografia até existir ao menos uma projeção real
ativa e validada.

## Contadores

`ProductionSchemaWrites=0`

`ProductionEnvWrites=0`

`ProductionBusinessWrites=0`

`ProductionManualDeploys=0`
