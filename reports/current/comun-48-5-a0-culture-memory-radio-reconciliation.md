# COMUN 48.5-A0 — Reconciliação de cultura, memória e rádio

Data: 17/08/2026
Baseline: `acd90657c221b7159b70f9ca1d91c9f36a5358b9`

## Decisão executiva

O inventário comprova que `comun_archive_items` é a raiz de identidade já compartilhada pelo tecido cultural. Fotografia e documentos vivem diretamente nessa raiz; Arte, Música, História Oral, Programa e Episódio de Rádio a especializam por FK 1:1 ou relações explícitas. A decisão é **reutilizar o Acervo com extensão**, sem criar `memory_v2`, migrar dados ou fundir tabelas.

Essa raiz compartilhada não autoriza um reader genérico. Direitos e consentimento permanecem por domínio: História Oral possui consentimento versionado, aprovação do participante, embargo e projeções separadas; Arte separa direitos por uso; Música separa catálogo e direito do fonograma; Rádio separa voz, música, transcript, safety e asset. Estado `published` sozinho não basta quando o domínio possui gates filhos.

Decisões de superfície:

- `/comun/acervo`: `CANONICAL_MEMORY_SURFACE`;
- `/comun/acervo/arte`: `REUSE_CANONICAL_SURFACE`;
- `/comun/arte`: `COMPATIBILITY_ROUTE_MERGE_FUTURE` — hoje usa o mesmo schema/helper, sem redirect neste A0;
- `/comun/radio`: `CANONICAL_EDITORIAL_SURFACE` sobre artefatos do Acervo;
- Música e História Oral: superfícies culturais especializadas, sendo História Oral uma boundary sensível.

Próximo slice: `48.5-A1 — Acervo Vivo, núcleo público canônico de memória`. Antes de ampliar experiência, A1 deve fechar os child gates públicos registrados neste relatório.

## Inventário de rotas

Foram inventariadas as rotas públicas de Acervo, item, Arte, artistas/criadores, coleções, contribuição, direitos/retirada, História Oral, identificação, Música, Rádio, programas, episódios, grade e contribuição. Também foram auditadas as superfícies administrativas de Acervo, storage, processamento/dead-letter, verificação, sugestões, contribuições, identificação, artistas/claims, direitos e créditos de Arte, Música/observabilidade, História Oral/consentimentos/transcrição/piloto e Rádio/programas/episódios/grade/contribuições/consentimentos/direitos.

Não foi criada rota, redirect, API ou flag.

## Matriz de reconciliação

| existing_structure                                                            | domain         | current_role / runtime_usage                              | durability  | public_private / rights / storage                                     | write_path / review                            | RLS                              | dependencies                 | decision                 | future_role                           | migration_needed | risk                                                        |
| ----------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- | ----------- | --------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------- | ---------------------------- | ------------------------ | ------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `comun_archive_items` + `assets`                                              | Acervo         | identidade/metadados e mídia comuns; readers server-side  | durable     | item published/public; asset public_safe/approved; originals privados | service-role; review editorial                 | enabled; SELECT público limitado | —                            | **REUSE_WITH_EXTENSION** | substrato canônico                    | não              | gate genérico insuficiente para filhos sensíveis            |
| collections + collection_items                                                | Coleção        | curadoria N:N, ordem e nota                               | durable     | coleção não amplia direitos do item                                   | admin/editorial                                | enabled                          | items/assets                 | **REUSE_CANONICAL**      | agrupamento curatorial                | não              | child/cover precisam de gate próprio                        |
| submissions + submission_assets + suggestions + removal                       | Foto histórica | entrada privada, pesquisa, rights e retirada              | operational | contato/original/moderação privados; derivada separada                | server action/service-role; pipeline de rights | enabled; clientes fechados       | items/assets                 | **REUSE_WITH_EXTENSION** | pipeline canônico de foto             | não              | envio ≠ publicação; suggestion ≠ fato                       |
| identification campaigns/items/reports/summaries/log                          | Identificação  | claim humana sanitizada e campanha editorial              | operational | texto bruto e reports privados                                        | ação server-side + revisão                     | enabled; clientes fechados       | item/suggestion/member inbox | **REUSE_WITH_EXTENSION** | claim revisável                       | não              | confiança/proveniência não são uniformes                    |
| artworks + agents + credits + rights + safety                                 | Arte           | especialização territorial 1:1 do item                    | durable     | local/contato/notas privados; permissões por uso                      | contribuição/admin; rights+safety              | enabled; clientes fechados       | item/assets/territory        | **SPECIALIZED_DOMAIN**   | expressão do Acervo                   | não              | reader não exige todos os child gates                       |
| artist profiles + releases + tracks + links + rights reviews                  | Música         | catálogo local e links autorizados                        | durable     | contatos/reviews privados; catálogo ≠ fonograma                       | admin/claims/submissions                       | enabled; clientes fechados       | item/assets                  | **SPECIALIZED_DOMAIN**   | memória musical sem ranking/streaming | não              | facets filhas não repetem gate do pai                       |
| oral histories + participants + consents + transcripts + segments + approvals | História Oral  | entrevista e projeções consentidas                        | durable     | bruto/riscos/terceiros privados; áudio/texto/name por consent         | operação editorial especializada               | enabled; clientes fechados       | item/assets/templates        | **SPECIALIZED_DOMAIN**   | boundary sensível própria             | não              | retirada e terceiros exigem operação contínua               |
| radio programs + episodes + schedule                                          | Rádio          | programa, unidade temporal e grade                        | durable     | publicação + voz/música/transcript/safety/asset                       | contribuição/admin; rights+editorial           | enabled; clientes fechados       | item/assets/pauta/territory  | **SPECIALIZED_DOMAIN**   | superfície editorial canônica         | não              | list reader usa publication_status sem todos os child gates |
| `comun_hub_archive_links`                                                     | Relações       | links explícitos com pauta/projeto/ação legada/território | durable     | ambos os lados precisam ser públicos                                  | admin/curadoria                                | enabled; clientes fechados       | hub/archive                  | **LEGACY_KEEP_COMPAT**   | relação explícita, nunca join textual | não              | ação aponta para raiz legada                                |
| `comun_search_documents`                                                      | Busca          | índice público reconstruível                              | derived     | somente projeção allowlisted; sem originais/contatos/consent          | sync service-role                              | enabled; RPCs fechadas           | superfícies públicas         | **DERIVED_LAYER**        | descoberta, não verdade               | não              | filho indexado sem gate pode vazar                          |
| processing jobs/attempts/events/heartbeats/alerts                             | Operação       | derivadas, retries, custody e observabilidade             | operational | metadata sanitizada server-only                                       | workers service-role                           | enabled; clientes fechados       | assets                       | **REUSE_CANONICAL**      | operação, não objeto cultural         | não              | órfãos/dead-letter precisam de observabilidade              |

O contrato TypeScript contém, por entrada, papel, uso, durabilidade, fronteiras pública/privada, direitos, storage, write, review, RLS, dependências, decisão, futuro e risco.

## Identidade, tempo e proveniência

- Item/artefato e coleção são distintos; coleção referencia, não duplica.
- Criador/artista/agente é identidade cultural, não conta, role ou Community.
- Território contextualiza explicitamente; não possui o item.
- `created_at` é data operacional. A raiz possui `approximate_date`, intervalo `year_start/year_end` e `circa`; História Oral possui `interview_date` e flag de aproximação; Rádio possui `recorded_at` e `published_at`.
- A raiz registra fonte, descrição da fonte, créditos e links; descrição editorial não deve substituir proveniência.
- Pesquisa acadêmica pode usar `item_type=document`, mas precisa de extensão bibliográfica futura para DOI, tipo, autores, instituição e versão. Resultado: `REUSE_EXISTING_ITEM_TYPE_WITH_EXTENSION`. Metadados podem ser públicos; arquivo integral apenas com licença.
- Documento cultural não é Dossiê de Pauta.

## Arte: overlap de superfície

`/comun/arte` e `/comun/acervo/arte` não são roots de dados concorrentes: ambos usam `listPublicArtworks()`/`getPublicArtwork()` e as mesmas tabelas `comun_archive_*`. O overlap é de experiência. A rota no Acervo é canônica; `/comun/arte` permanece compatibilidade até um slice futuro medir links e escolher merge/redirect. A0 não altera navegação.

## Rádio

Programa é identidade editorial durável; episódio é unidade temporal; grade é organização temporal. Programa e episódio têm `archive_item_id` como PK/FK, portanto pertencem ao tecido de memória sem perder seu modelo próprio. A Rádio é `CANONICAL_EDITORIAL_SURFACE`, não nova raiz nem transmissão ao vivo. Nenhum Icecast, RSS, podcast syndication ou streaming foi aberto.

## Direitos e consentimento

| domínio           | copyright                        | display permission                | reuse permission                  | voz/imagem                  | retirada/takedown | atribuição/anônimo                   | gate                                               |
| ----------------- | -------------------------------- | --------------------------------- | --------------------------------- | --------------------------- | ----------------- | ------------------------------------ | -------------------------------------------------- |
| historical_photo  | conhecido ou fail-closed         | exigida                           | separada                          | contextual quando há pessoa | ambos             | crédito explícito/anônimo            | `LEGAL_RIGHTS_REQUIRED`                            |
| art               | holder/status                    | `allow_display`                   | flags por uso                     | quando identificável        | ambos             | crédito obrigatório/anônimo possível | `LEGAL_RIGHTS_REQUIRED` + safety quando necessário |
| music             | composição e fonograma separados | metadados de catálogo             | áudio/fonograma explícito         | intérprete contextual       | ambos             | writers/performers                   | `LEGAL_RIGHTS_REQUIRED`                            |
| oral_history      | gravação e texto                 | consentimento `publication_final` | por mídia/finalidade              | granular e versionado       | ambos             | nome autorizado ou anônimo           | `CONSENT_REQUIRED` + `SAFETY_REQUIRED`             |
| radio_episode     | episódio + usos musicais         | voz e áudio                       | download/clips/campaign separados | granular                    | ambos             | créditos públicos/anônimo            | direitos + consentimento + safety/editorial        |
| academic_document | bibliografia separada do arquivo | metadados                         | texto integral só por licença     | normalmente N/A             | ambos             | bibliográfica                        | direitos para arquivo hospedado                    |

Consentimento de publicação nunca vira licença Creative Commons. URL pública nunca vira permissão. Retirada pública deve preservar audit/proveniência operacional quando legalmente permitido, sem hard delete silencioso.

## Storage e processamento

- Acervo: assets distinguem `private_original` de `public_safe`, com role, checksum, MIME, tamanho, derivada, integridade e review.
- Arte: buckets `archive-private-originals` e `archive-public-derivatives`, MIME de imagem e limites próprios; upload operacional é server-only.
- Rádio: `radio-private-originals` e `radio-public-audio`, limite/MIME versionados pelo perfil v1; originals não são públicos.
- História Oral reutiliza assets e custody events, mantendo consent evidence e material bruto privados.
- Photo processing possui jobs/attempts/events, idempotência, retry/dead-letter e heartbeats; Música possui link checks/observabilidade; Rádio não introduz live/transcoding novo neste contrato.

O preflight consulta somente metadata dos buckets e policies. Não lê, baixa ou assina mídia. Duplicação e órfãos são dívida operacional a medir em slice próprio; A0 não move nem limpa objetos.

## Public projection e gaps fail-closed

Readers server-side usam service role e allowlists, porém foram registrados quatro gaps importantes:

1. Arte seleciona rights filhos, mas o reader não exige no banco `consent_status` e `allow_display` antes de devolver a obra.
2. A listagem de Rádio exige `publication_status=published`, mas não consulta/revalida voice consents, music rights, safety e transcript; o helper de publicação existe, porém não é aplicado no read.
3. Facets de Música consultam perfis/releases sem restringir pela raiz pública.
4. Identificação não possui contrato epistemológico uniforme de fonte/confiança/versionamento para toda claim.

Esses gaps bloqueiam ampliar a projeção A1 até haver gate explícito; não justificam migration no A0.

História Oral é o reader mais defensivo: combina item público, estado especializado, embargo, consentimento final por participante, transcript aprovado, segmentos aprovados e asset público permitido.

## Relações com 48.3/48.4 e E1

- D1 continua memória causal do ciclo de uma Pauta; Acervo é memória cultural. Nenhuma conversão automática em qualquer direção.
- Pauta, território, comunidade e ação são contextos opcionais por relação persistida explícita.
- Nenhum vínculo por título, label, tag, keyword, embedding ou IA.
- `comun_hub_archive_links` preserva compatibilidade, mas seu `action_id` aponta para `comun_mobilization_actions`; não deve fundar novos links com Ação canônica sem reconciliação futura.
- `cultural_action` em Collective Actions impede criar segunda raiz de evento/ação cultural.
- Relata privado e economia solidária não alimentam o Acervo automaticamente.
- Cultura encaixa em Entender e, contextualmente, Participar; não cria quinta porta E1.

## Busca, privacidade e acessibilidade

Civic Search é `DERIVED_LAYER`. Seu SQL declara projeção reconstruível e proíbe contatos, notas privadas, originais, coordenadas e referências de autorização. A0 mantém esse contrato e exige que qualquer filho cultural só entre após o gate público especializado.

Boundary explícita:

- pública: metadados publicados, derivadas aprovadas, atribuição autorizada, transcript/trecho público;
- privada: original, contato, evidence de consentimento, transcript bruto, claims de terceiros, localização precisa;
- server-only: object keys, review/legal notes, moderação, jobs e custody.

Rotas atuais já possuem imagem/alt, áudio/controls e transcript em partes do tecido, mas a consistência entre domínios é dívida A1: descrição não é alt; Rádio/História Oral precisam manter transcript/caption e controles por teclado; payloads de listagem não devem carregar original ou áudio bruto.

## Decisão materializada

```json
{
  "memoryRoot": "COMUN_ARCHIVE_ITEMS_REUSE_WITH_EXTENSION",
  "archiveItem": "CANONICAL_DURABLE_ARTIFACT",
  "collection": "CANONICAL_CURATORIAL_GROUPING",
  "art": "SPECIALIZED_DOMAIN_ON_ARCHIVE_ITEM",
  "creator": "CULTURAL_IDENTITY_NOT_AUTH_ROLE",
  "historicalPhoto": "SPECIALIZED_SUBMISSION_AND_PROCESSING_PIPELINE",
  "identificationClaim": "REUSE_WITH_EXTENSION_REVISABLE_CLAIM",
  "oralHistory": "SPECIALIZED_SENSITIVE_DOMAIN_ON_ARCHIVE_ITEM",
  "music": "SPECIALIZED_CATALOG_DOMAIN_ON_ARCHIVE_ITEM",
  "radioProgram": "SPECIALIZED_EDITORIAL_IDENTITY_ON_ARCHIVE_ITEM",
  "radioEpisode": "SPECIALIZED_TEMPORAL_ARTIFACT_ON_ARCHIVE_ITEM",
  "radioSchedule": "EDITORIAL_TEMPORAL_ORGANIZATION_NOT_ARTIFACT",
  "academicResearch": "REUSE_EXISTING_ITEM_TYPE_WITH_EXTENSION",
  "rights": "FIRST_CLASS_PER_DOMAIN_FAIL_CLOSED",
  "consent": "VERSIONED_PURPOSE_AND_MEDIA_SPECIFIC",
  "storage": "SEPARATE_PRIVATE_ORIGINAL_AND_PUBLIC_DERIVATIVE",
  "search": "DERIVED_LAYER",
  "pautaMemory": "SEPARATE_EXPLICIT_LINK_ONLY",
  "territory": "OPTIONAL_EXPLICIT_CONTEXT",
  "community": "OPTIONAL_EXPLICIT_CONTEXT",
  "action": "OPTIONAL_EXPLICIT_CONTEXT",
  "nextSlice": "48.5-A1_ACERVO_VIVO_PUBLIC_MEMORY_CORE"
}
```

## Gates e preflight

- zero migration/schema/UI/API/flag/deploy funcional;
- zero upload, publicação, alteração de rights ou business write;
- workflow `COMUN 48.5-A0 culture memory radio reconciliation preflight` em `BEGIN READ ONLY`;
- metadata-only para 37 tabelas, FKs, constraints, indexes, policies, grants implícitos, RLS/FORCE RLS, funções e quatro buckets;
- `businessContentRead=false` e `mediaContentRead=false`;
- plano remoto esperado `[]`, preservando o external-ledger histórico de Calçadas;
- nenhuma mídia, transcrição, história oral ou conteúdo cultural é lido remotamente.

Estado terminal condicionado ao merge e preflight verde:

`COMUN_48_5_A0_CULTURE_MEMORY_RADIO_RECONCILIATION_CONTRACT_GREEN`

A1 não foi iniciado.
