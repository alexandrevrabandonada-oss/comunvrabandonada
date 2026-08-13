# COMUN 48.3-A0 — Reconciliação de Pautas Vivas

**Estado:** `COMUN_48_3_A0_PAUTAS_VIVAS_RECONCILIATION_CONTRACT_GREEN`
**Baseline:** `06cf9eb8d7f17eca2b2932058808b8d9c2051f7a`
**Data da auditoria:** 2026-08-13
**Escopo:** contrato e arquitetura; sem UI, API, flag, migration ou escrita de produção.

## Decisão executiva

`public.comun_pauta_spaces` já é a raiz canônica mais próxima de uma Pauta Viva. A decisão é **`pauta_spaces_with_extension`**, não uma nova tabela-raiz. A extensão futura deve ser aditiva e mínima: preservar a pergunta/problema/proposta da pauta, referências públicas versionadas e território opcional tipado, sem transformar esses campos em gates para o primeiro salvamento.

O Dossiê não é a Pauta. `comun_pauta_dossiers` e seus snapshots são uma camada editorial derivada e publicável da pauta, protegida por revisão factual/editorial. Contribuições, círculos, sínteses, tarefas, ações e memória são sub-recursos ligados à mesma pauta; nenhum deles deve criar uma segunda identidade.

Não houve acesso remoto ao Supabase: nenhuma variável de conexão estava configurada. Portanto, contagens ou o estado efetivo do catálogo Production não foram inferidos. A auditoria remota permanece uma atividade de A1/preflight, não um motivo para alterar o produto neste tijolo.

## Arquitetura canônica proposta

```text
Pauta (comun_pauta_spaces)
├── identidade (id + slug canônico)
├── pergunta / problema / proposta
├── evidências públicas opcionais (referências, não cópias de snapshots)
├── contribuições e conversa
├── sínteses versionadas
├── comunidade(s) e círculos de construção
├── zero, uma ou várias ações
└── resultados e memória
    └── Dossiê = síntese editorial/publicável versionada da Pauta
```

O fluxo preservado é `EVIDÊNCIA → PAUTA → CONVERSA → ORGANIZAÇÃO → AÇÃO → MEMÓRIA`, mas uma pauta também pode nascer manualmente de uma necessidade, proposta ou problema percebido. Evidência é enriquecimento, não pré-requisito absoluto.

## Matriz de reconciliação

| existing_structure | current_role | current_runtime_usage | public/private | write_path | RLS | dependencies | decision | future_role | migration_needed | risk |
|---|---|---|---|---|---|---|---|---|---|---|
| `comun_pauta_spaces` | Raiz de pautas organizadas | `/comun/pautas`, detalhe por slug, admin, relações do hub | Projeção pública filtrada; campos internos também existem | Server actions/admin; nenhuma escrita pública direta identificada nesta auditoria | RLS; leitura pública apenas `visibility=public` e não arquivada | território, comunidade, contribuições, tarefas, evidências, ações, resultados | **REUSE_WITH_EXTENSION** | Pauta Viva canônica | A1 somente se campos mínimos forem comprovadamente ausentes | mistura de campos operacionais/editoriais na mesma raiz; status históricos não são o modelo conceitual final |
| `comun_pauta_contributions` | Relatos, propostas, dúvidas, contrapontos e ofertas de tarefa | Listagem pública apenas de aprovadas; admin/moderação | Texto e contato privado; projeção sanitizada pública | Server-only após endurecimento de RLS | `service_role` para escrita; leitura pública foi removida da tabela e ocorre via servidor | `pauta_id`, safety/rate-limit, comunidade/círculos | **REUSE_CANONICAL** como contribuição; extensão futura para roda se necessária | Conversa persistente, não feed infinito | Não neste A0 | texto original, hashes e contato exigem sanitização contínua |
| `comun_pauta_synthesis_versions` | Histórico de mudanças em síntese e próximo passo | Admin e helpers de pauta | Bastidor editorial | Server-only | RLS + `service_role` only após hardening | `pauta_id` | **REUSE_CANONICAL** | Memória/versionamento de conclusões | Não neste A0 | não confundir histórico interno com publicação pública |
| `comun_pauta_evidence_items` | Itens de evidência ligados à pauta | Projeção de evidência aprovada/public-safe | Público somente quando `approved` + `public_safe`; notas internas existem | Server-side | leitura pública condicionada; escrita não pública | `pauta_id`, report/protocol/manual/external source | **REUSE_WITH_EXTENSION** | Ponte para `PublicEvidenceReferenceV1`, sem copiar snapshot | Provável extensão futura de referência/versão | `source_id` UUID e `source_type` atual não cobrem integralmente refs cross-observatory |
| `comun_pauta_dossiers` | Rascunho de dossiê/síntese editorial | Admin; página pública usa snapshot | Privado até publicação | Admin/editorial server-only | RLS e grants restritos a `service_role` | pauta, evidence items, reviews | **DERIVED_LAYER** | Síntese pública versionada da pauta | Não neste A0 | risco de tratar dossiê como raiz; deve permanecer derivado |
| `comun_pauta_dossier_evidence` | Seleção/ordenação de evidências no dossiê | Admin | Privado/curatorial | Server-only | `service_role` only | dossier, evidence item | **DERIVED_LAYER** | Composição editorial | Não | não é vínculo geral Pauta↔evidência |
| `comun_pauta_dossier_reviews` | Revisão factual e editorial | Fila/admin de revisão | Privado | Admin/review ops | Admin/service-only | dossier | **REUSE_CANONICAL** como gate editorial | Proteger publicação, não organização | Não | transportar esse gate para conversa/participação seria erro de produto |
| `comun_pauta_dossier_publication_snapshots` | Versões imutáveis publicadas/rollback | Páginas públicas de dossiê | Público por página/servidor; tabela restrita | Publisher/admin server-only | `service_role` only | dossier | **DERIVED_LAYER** | Memória editorial citável | Não | histórico pode ser confundido com estado vivo |
| `comun_public_dossier_features` / páginas públicas | Curadoria de destaque e navegação editorial | `/comun/dossies`, detalhe e admin | Público somente após snapshot | Admin/service-only | tabela restrita; leitura por servidor | publication snapshot | **DERIVED_LAYER** | Descoberta editorial, não organização | Não | destaque editorial não deve virar ranking de pautas |
| `comun_pauta_tasks` | Tarefas e próximos passos da pauta | Detalhe/admin; pode aceitar voluntários | Campos públicos ou internos por `visibility` | Server actions/admin | leitura pública filtrada; escrita server-side | pauta, ação/projeto, comunidade | **REUSE_CANONICAL** | Organização operacional da pauta | Não | tarefa não é ação nem pauta |
| `comun_pauta_updates` / timeline / resultados | Atualizações, transições, resultados e memória processual | Detalhe, hub e resultados públicos conforme estado | Mistos; `public` exige projeção | Server/admin | políticas por visibilidade/estado | pauta, ação, evidence, protocol, result, archive | **REUSE_CANONICAL** | Memória factual do processo | Não | joins polimórficos precisam continuar explícitos; sem heurística por título |
| `comun_pauta_modules` | Módulos/miniapps configuráveis por pauta | Admin e módulos públicos ativos | `private`, `participants`, `internal`, `public` | Admin/server | guards relacionais e configuração allowlisted | pauta, module registry | **DERIVED_LAYER** | Miniapp opcional que serve uma pauta | Não | miniapp não deve ser identidade nem requisito da pauta |
| `comun_construction_circles` + rounds | Rodas persistentes de conversa e etapas | Superfície pública/admin quando abertas | Corpo público; autoria/contato e moderação têm partes privadas | Server actions/member flows | RLS por estado/visibilidade (confirmar remoto em A1) | pauta, módulos, evidence | **REUSE_CANONICAL** | Conversa estruturada, não feed de comentários | Não | ainda há necessidade de alinhar semântica com `pauta_contributions` |
| `comun_circle_contributions` / syntheses | Participações e sínteses por rodada | Roda/admin/Minha Participação | Público sanitizado ou privado conforme status | Member/server actions | políticas por rodada/status; validar catálogo remoto em A1 | circle, round, evidence | **REUSE_WITH_EXTENSION** | Conversa e síntese de organização | Não | duplicidade semântica com contribuições gerais |
| `comun_pauta_memberships` | Participação e papel dentro de uma pauta | `Minha Participação`, guards de papel | Privado da pessoa/servidor | Authenticated server actions | membro lê seu próprio vínculo; mutações server-side | auth user, pauta | **REUSE_CANONICAL** | Participação sem papel editorial obrigatório | Não | não exigir login para toda leitura/criação futura sem decisão de produto |
| `comun_pauta_action_cycles` + events/decisions | Esteira da pauta até decisão, ação, resultado e memória | Admin/political cycle; projeção pública somente explicitamente visível | Eventos públicos sanitizados; ator/notas privadas bloqueados | Admin + RPC transacional com idempotência | RLS público read-only; escrita service/admin | synthesis, circles, collective action, forwarding, protocol, result | **REUSE_CANONICAL** | Ponte Pauta→Ação→Memória | Não | máquina atual inclui gates e papéis administrativos; não deve bloquear toda organização reversível |
| `comun_collective_actions` + tasks/participations | Ação concreta com tempo, participantes, tarefas e resultado | `/comun/acoes`, detalhe e Minha Participação | Ação publicada pública; participação/atribuições privadas | Server actions; membro pode aderir/assumir tarefa | RLS público para ação publicada; participação própria para authenticated; service para administração | pauta opcional, comunidade, tasks, updates | **REUSE_CANONICAL** | Zero, uma ou várias ações por pauta | Não | ação coletiva não é pauta; forwarding e memória possuem risco próprio |
| `comun_collective_action_*` memory/forwarding | Administração, encaminhamento e memória da ação | Admin/detalhe conforme revisão | Conteúdo público somente após revisão; operacional privado | Admin/service; participação própria | RLS fail-closed e publicação explícita | collective action | **REUSE_CANONICAL** como subciclo de ação | Memória verificável da ação | Não | não criar cópia paralela para Pauta Viva |
| `comun_communities` | Comunidades temáticas/territoriais permanentes | `/comun/comunidades`, `/comun/c/[slug]` | Públicas ativas; vínculos de membro privados | Admin e membership server actions | leitura pública de ativas; vínculos/roles próprios | auth, work groups | **REUSE_CANONICAL** | Contexto que pode conter várias pautas | Não | `pauta_spaces.community` é texto legado/projeção, não FK universal |
| community memberships/roles/work groups | Pertencimento, governança e grupos de trabalho | Minha Participação/admin; grupos públicos ativos | Identidade e papéis privados; grupos/objetivos públicos | Authenticated/admin server actions | RLS: titular lê próprio vínculo; membros/roles server-only; grupos ativos públicos | communities, pautas, tasks | **REUSE_CANONICAL** | Organização em torno de uma ou mais pautas | Não | não tornar comunidade sinônimo de pauta |
| `comun_dossiers` / `comun_issues` legados | Primeira geração de questões e dossiês | Algumas consultas/páginas e compatibilidade histórica | Publicação legada condicionada | Server/admin e legado | políticas antigas de leitura publicada | communities, reports | **LEGACY_KEEP_COMPAT** + **DEPRECATE_CONCEPTUALLY** | Compatibilidade/migração futura, nunca nova raiz | A1 deve mapear migração conceitual sem apagar | semântica `issue`/`dossier` diverge do modelo atual |
| `comun_mobilization_actions` | Ação legada do hub central | Relações antigas, resultados, rádio, civic graph | Mistos; campos internos e localização privada | Server/admin | tabela restrita a service role no migration-base | pauta, project, territory, result | **LEGACY_KEEP_COMPAT** | Compatibilidade enquanto ações coletivas atuais amadurecem | Não neste A0 | existem dois conceitos de ação; joins novos devem preferir `comun_collective_actions` |
| `comun_hub_pauta_reports` / Relata | Vínculo histórico entre pauta e relato | Civic graph/admin; não é publicação automática | Relato bruto privado; só projeções sanitizadas podem aparecer | Server/admin | Relata privado protegido; vínculo server-side | `comun_reports`, pauta | **DEPRECATE_CONCEPTUALLY** para auto-conversão | Ponte futura somente após revisão/sanitização explícita | Não | risco crítico de transformar relato privado em pauta pública |
| `PublicEvidenceReferenceV1` (Panorama) | Referência pública resumida a claim e fontes | DTO do Panorama, sem persistência | Público, allowlisted | Pure/runtime; sem DB write | Proteção pelo DTO/firewall público | observatory DTOs, source refs | **REUSE_WITH_EXTENSION** | Evidência citável pela pauta | Não neste A0 | `refId` atual (`panorama:<layer>:coverage`) não fixa sozinho snapshot/version; precisa versionamento/resolver antes de persistir |
| civic search | Projeção de descoberta pública | `/comun/buscar`, RPC/search worker | Sanitizada; índice não é fonte de verdade | Worker/server | tabelas de busca service-only, RPC pública sanitizada | pauta, action, territory, dossier | **REUSE_WITH_EXTENSION** | Descoberta de pautas, sem novo índice em A0 | Não | indexação deve respeitar status/visibilidade e não duplicar identidade |

### RLS e acesso remoto

A matriz estática `scripts/audit-comun-rls-matrix.mjs` classifica as tabelas de pauta como públicas somente em projeções seguras, e mantém contribuições, sínteses, dossiês, reviews, snapshots e dados de identidade fora do acesso direto público. Os migrations também mostram que mutações editoriais/operacionais passam pelo servidor ou `service_role`; RPCs do action cycle usam versão esperada, idempotência e papéis.

Não foram executadas consultas de catálogo, RLS, grants ou RPC em Production porque não havia credencial/configuração remota. A1 deve repetir a matriz contra o ambiente real com transação `READ ONLY`, sem selecionar texto de relatos, identidade, anexos, localização ou conteúdo de forwarding.

## O que os gates protegem

- **Double review, review queue e publication workflow:** protegem a exatidão factual, a redação editorial e a publicação de um Dossiê/snapshot.
- **Moderação de contribuição:** protege texto recebido, abuso, contato e risco.
- **Action cycle:** protege transições administrativas irreversíveis, consistência, idempotência, protocolo, resultado verificado e memória.
- **Não são gates universais:** criar uma pauta, participar, conversar, propor, seguir uma pauta ou organizar uma tarefa reversível não deve depender automaticamente da dupla revisão editorial.

O papel editorial é distinto de `participant`, `facilitator`, `coordinator` e demais papéis de organização. A experiência futura deve preservar o fail-closed para alto risco sem transformar cada avanço normal em aprovação humana.

## Evidência pública e estabilidade

`PublicEvidenceReferenceV1` atualmente permite apenas `descriptive_fact`, `coverage_statement` e `data_gap`, o que é compatível com uma pauta sem converter fato em posição política, causa, risco ou obrigação legal. O DTO contém `publicPath`, `sourceKind`, `referencePeriod`, `sourceRefs` e limitações.

A referência ainda **não está pronta para persistência durável sem extensão**: o `refId` atual é derivado do layer/claim (`panorama:<layer>:coverage`) e pode sobreviver ao deploy, mas não identifica sozinho a versão do snapshot. Antes de A1 persistir uma ligação, o contrato deve capturar namespace/version, `sourceRefs` estáveis e, quando necessário, `snapshotId`/`sourceId` predecessor. Um futuro `resolvePublicEvidenceReference(refId)` deve devolver somente o DTO público correspondente e manter versões históricas quando existirem.

`PautaEvidenceLink` fica, portanto, como contrato futuro conceitual; não há migration neste A0. A pauta referencia evidência pública estável, nunca copia 5.676 registros de energia, 240 medições do rio, geometrias ou payloads completos do Panorama.

## Identidade, território e save-first

- A identidade pública existente é `comun_pauta_spaces.id` + `slug`; não criar uma segunda identidade para a mesma pauta.
- `title` e `summary` já existem. A pergunta/problema/proposta pode ser representada inicialmente por `summary`/campos públicos existentes, mas A1 deve confirmar o menor campo aditivo necessário, sem exigir categoria, território, dossiê, ação, comunidade ou evidência antes do primeiro save.
- `territory_id` é opcional. Uma pauta pode ser municipal, regional, territorial ou sem território específico. Setor censitário, bairro e coordenada não são gates nem equivalentes.
- O status atual (`observing`, `organizing`, `drafting`, `pressuring`, `resolved`, `unresolved`, `archived`) é histórico e útil para compatibilidade. Não adotar uma nova máquina `draft/open/active/...` sem reconciliação de estados e dados existentes.
- `resolved`/`archived` devem permanecer acessíveis como memória; não apagar nem ocultar a história apenas por deixar de estar ativa.

## Decisão de arquitetura

```json
{
  "canonicalPauta": "pauta_spaces_with_extension",
  "dossier": "derived_public_synthesis",
  "contributions": "reuse_existing_with_conversation_extension_if_needed",
  "communities": "reuse_existing_as_optional_context",
  "collectiveActions": "reuse_existing_as_distinct_action_object",
  "evidenceLink": "needs_extension",
  "publicEvidenceReference": "needs_versioning",
  "nextSlice": "48.3-A1"
}
```

### Próximas fatias

- **48.3-A1:** contrato mínimo/salvar primeiro, extensão aditiva da pauta se a lacuna for confirmada, referência de evidência versionada e resolver read-only. Ainda sem publicação automática.
- **48.3-B:** persistent communities e rodas: estado da arquitetura atual é **`NEEDS_RECONCILIATION_48_3_B`**, por haver comunidades, memberships, círculos e grupos de trabalho com papéis sobrepostos que precisam de contrato de experiência único.
- **48.3-C:** ações coletivas: base estrutural é **`READY_48_3_C`** para o objeto ação separado (estado, participantes, tarefas e resultado), mas a ponte Pauta→Ação e a escolha entre `comun_mobilization_actions` legado e `comun_collective_actions` devem ser explicitadas em A1/C.
- **48.3-D:** memória: action cycle, updates, results e archive links fornecem base suficiente, porém a política pública de memória ainda precisa ser alinhada à síntese da pauta.

## Invariantes de segurança para A1

1. Relato privado nunca vira pauta ou publicação automaticamente.
2. Pauta pública, contribuição aprovada, evidência public-safe, Dossiê publicado e memória revisada são projeções distintas.
3. Nenhuma referência pública contém `raw_text`, `contact_private`, `user_id`, token, anexo, localização privada ou conteúdo de forwarding.
4. `data_gap` descreve uma lacuna contratual; não afirma que o fenômeno não existe.
5. Fato público não determina a posição coletiva da pauta.
6. Nenhum estado resolvido é hard-deleted.
7. Não criar nova tabela, API, UI, flag, index ou migration até A1 provar a lacuna.

## Validação deste tijolo

- Baseline e ancestry: confirmados; `HEAD = 06cf9eb8d7f17eca2b2932058808b8d9c2051f7a`.
- Diff de migrations contra o baseline: vazio.
- Auditoria estática: migrations de pauta/dossiê/círculos/ações, RLS matrix, tipos, helpers, rotas e civic graph catalog examinados.
- Auditoria remota: não executada por ausência de configuração; nenhum fallback inseguro.
- Escritas de negócio/Production: `0`.
- UI/API/feature flag/deploy/migration novos: `0`.

## Terminal

`COMUN_48_3_A0_PAUTAS_VIVAS_RECONCILIATION_CONTRACT_GREEN`

Este terminal fecha somente a reconciliação arquitetural. Não autoriza ativação pública de uma nova experiência de Pautas Vivas nem o início automático de A1/B/C.
