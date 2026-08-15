# COMUN 48.4-A0 — Reconciliação da economia solidária

Data: 15/08/2026

Baseline: `3d1d8da654cf83570858b5f534b485fd27f28f0d`

Estado: contrato local concluído; preflight remoto e promoção ainda não registrados.

## Decisão executiva

A Feirinha será uma **superfície de descoberta**, não uma entidade de banco nem um marketplace. O nome público amigável recomendado é **Feirinha**, contextualizado por **Trocas e economia solidária**. Sua entrada principal futura é `Participar`, com descoberta secundária por Explorar, território e comunidades; ela não cria uma quinta porta na Home.

`comun_territorial_organizations` permanece a raiz inicial das organizações, classificada como `REUSE_WITH_EXTENSION`. `comun_territorial_needs` também é `REUSE_WITH_EXTENSION` e continua o objeto canônico de necessidades. `comun_territorial_need_interests` é `REUSE_CANONICAL` **somente para necessidades**: `offer_private` é uma mensagem privada de ajuda, não uma Oferta estruturada.

Não existe no schema um objeto adequado de Oferta. Resultado obrigatório:

`offer = NEEDS_NEW_CANONICAL_OBJECT`

A1 poderá criar o mínimo somente depois de fechar gates públicos, moderação, identidade e ciclo de expiração. A0 não cria esse objeto.

## Matriz de reconciliação

| existing_structure | current_role | runtime_usage | public_private | write_path | RLS | dependencies | decision | future_role | migration_needed | risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `comun_hub_territories` | raiz territorial e chave técnica das especializações | Mapa Popular, ficha territorial, Civic Search e `/comun/cooperativas` | mistura campos públicos e privados; projeção server-side | admin/editor + contribuição moderada | enabled; clientes diretos fechados | pauta, projeto, layers, especializações | **REUSE_CANONICAL** | contexto territorial opcional, não identidade econômica | não | shared PK limita ator em vários territórios |
| `comun_territorial_organizations` | perfil durável 1:1 com território | lida por `listPublicMapData()` e filtrada pela presença na rota | `private_contact`/notas privadas; demais campos candidatos públicos | admin/editor via service role | enabled; clientes diretos fechados | `comun_hub_territories` | **REUSE_WITH_EXTENSION** | raiz inicial de organização econômica | não em A0 | filho não possui `visibility` e runtime não filtra status/verificação próprios |
| `comun_territorial_organization_materials` | relação organização↔material reciclável | sem consumo público atual encontrado | nota pública + curadoria server-only | service role | enabled; clientes diretos fechados | organization + recycling material | **DERIVED_LAYER** | especialização de reciclagem | não | material reciclável não é produto/oferta genérica |
| `comun_territorial_needs` | necessidade territorial/organizacional com ciclo | Mapa Popular, `/comun/cooperativas` e admin territorial | projeção `public` em `open/partially_met`; responsável/notas privadas | admin/editor | enabled; clientes diretos fechados | território, organização, pauta, projeto, ação/tarefa legadas | **REUSE_WITH_EXTENSION** | objeto canônico de necessidade | não em A0 | FKs de ação/tarefa apontam para raiz legada |
| `comun_territorial_need_interests` | gesto privado de oferecer ajuda a uma necessidade | nenhum reader público; matriz RLS o classifica server-only | contato, mensagem, consentimento e workflow privados | service role | enabled; clientes diretos fechados | necessidade | **REUSE_CANONICAL** | interesse canônico somente para necessidades | não | não generalizar `offer_private` como Oferta |
| `comun_recycling_materials` | taxonomia de materiais recicláveis | Mapa Popular e Reciclagem | materiais ativos publicados pelo servidor | admin/editor | enabled; clientes diretos fechados | pontos, organizações e rotas | **REUSE_CANONICAL** | vocabulário especializado | não | não converter em catálogo comercial |
| `comun_recycling_points` + `comun_recycling_point_materials` | pontos e aceitações verificadas | Mapa Popular e `/comun/reciclagem` | campos públicos moderados; notas internas privadas | admin/editor | enabled; clientes diretos fechados | território + materiais | **REUSE_CANONICAL** | caso especializado visível na descoberta | não | status filho também precisa de gate próprio |
| `comun_collection_routes` + materiais | rota operacional de coleta | nenhuma projeção pública atual encontrada | cobertura pública + operação server-only | service role | enabled; clientes diretos fechados | território, organização e materiais | **REUSE_CANONICAL** | caso especializado de circulação/reciclagem | não | rota não é entrega/frete de marketplace |
| `comun_territorial_layers` + `comun_territory_layers` | configuração e associação de camadas | Mapa Popular | apenas camadas públicas ativas na projeção | admin/editor | enabled; clientes diretos fechados | território | **DERIVED_LAYER** | filtro/contexto de descoberta | não | camada não cria identidade econômica |
| `listPublicMapData()` | agregador server-side do Mapa Popular | mapa, reciclagem, cooperativas e território tomado | allowlist de colunas, mas gates filhos incompletos | read-only | usa service role | todas as estruturas territoriais | **DERIVED_LAYER** | contexto geográfico; A1 precisa de adapter econômico próprio | não | herança implícita do gate do pai |
| `/comun/cooperativas` | filtro simples do Mapa Popular | rota pública atual | não renderiza contato no card; conta campo textual autorizado | nenhum write próprio | indireto | `listPublicMapData()` | **REUSE_WITH_EXTENSION** | rota canônica a recompor como diretório econômico | não em A0 | hoje não separa perfil, oferta e necessidade |
| `comun_search_documents` | índice derivado de descoberta | Civic Search | indexa território pai; não possui org/need econômico autônomo | reindex server-side | contrato próprio | fontes públicas diversas | **DERIVED_LAYER** | descoberta futura após DTO econômico estável | não | search não é source of truth nem vínculo |
| `comun_pauta_spaces` | questão coletiva | necessidade pode ter `pauta_id` | contrato público próprio | Pautas Vivas | contrato próprio | necessidades | **REUSE_CANONICAL** | contexto opcional explícito | não | nunca auto-criar/converter |
| `comun_collective_actions` | Ação canônica 48.3-C1 | experiência pública de Ações | contrato público próprio | fluxo canônico de Ações | contrato próprio | pauta/comunidade opcionais | **REUSE_CANONICAL** | destino de novos links econômicos quando necessários | não em A0 | nenhuma conversão automática |
| `territorial_needs.action_id` + `territorial_social_use_proposals.action_id` | vínculos históricos de ação | Mapa Popular ainda seleciona `need.action_id` | IDs internos do ciclo legado | admin histórico | tabelas fechadas | `comun_mobilization_actions` | **LEGACY_KEEP_COMPAT** | preservar; novos links preferem collective actions | futura, só com caso real | reviver duas raízes concorrentes de Ação |
| `comun_communities` | comunidade social durável | nenhuma relação econômica explícita encontrada | projeção social própria; memberships privados | fluxo social | contrato próprio | nenhuma FK econômica | **UNRELATED** | contexto opcional futuro | não em A0 | cooperativa ≠ Comunidade; sem join por label |

## Gap da projeção pública

O pai `comun_hub_territories` é filtrado por `visibility=public`, `status != archived` e `verification_status != unverified`. Porém a consulta de `comun_territorial_organizations` em `listPublicMapData()` não possui filtro explícito de `status` ou `verification_status`. Como a tabela filha também não possui `visibility`, uma organização `unverified`, `paused` ou `closed` pode ser anexada a um pai elegível.

Decisão fail-closed para A1:

`BLOCK_PUBLIC_ECONOMIC_ADAPTER_UNTIL_CHILD_GATE_IS_EXPLICIT`

O A0 registra o gap sem alterar a UI/runtime. A1 deve definir allowlists próprias antes de publicar a nova projeção econômica.

## Contato e privacidade

`public_contact_authorized` é uma coluna `text`, não um boolean. Ela deve ser entendida como **valor público de contato deliberadamente autorizado**, nunca como autorização abstrata e nunca como fonte para copiar `private_contact`. O naming é dívida de clareza.

- organização pública: somente campos allowlisted e gates próprios;
- `private_contact` e `internal_notes`: server-only;
- necessidade pública: resumo/tipo/estado elegíveis; responsável e notas privados;
- interesse: integralmente privado por default, inclusive `public_alias`, contato, mensagem, consentimento e workflow;
- oferta futura: draft/contato/negociação privados até publicação explícita;
- troca futura: participantes, termos e mensagens privados;
- território: somente projeção pública segura; nunca localização privada.

## Gramática, durabilidade e relações

- Organização é durável.
- Oferta será temporária e poderá expirar.
- Necessidade possui ciclo e pode virar memória, sem ser apagada ao ser atendida.
- Interesse é privado e pontual.
- Troca é eventual e consentida.
- Feirinha é somente a superfície de descoberta.

Estado real: organização tem exatamente um território por shared primary key; organização→necessidades existe via `organization_territory_id`; necessidade→interesses existe; organização→ofertas, ofertas→interesses/trocas e relações diretas com comunidades, pautas e ações não existem. Nenhuma cardinalidade inexistente foi afirmada como implementada.

## Governança recomendada

Hoje criação e edição são administrativas, por server action com service role. Futuramente, um cadastro/claim de organização deve salvar primeiro como privado ou pendente. A natureza da organização pode ser autodeclarada como candidata, enquanto `verification_status` registra revisão distinta. Correções continuam moderadas e uma futura pessoa responsável pela organização precisa de autorização explícita e revogável.

Verificação mede proveniência e atualização; não reputação. Não haverá estrelas, likes, reviews, ranking, seguidores ou vendas como score.

Produtor individual fica fora do primeiro ciclo, mas a arquitetura futura não deve impedir sua inclusão. Essa entrada exige contrato próprio de identidade pública, segurança, abuso e manutenção; não será simulada como organização coletiva.

## Escopo econômico

O primeiro ciclo admite cooperativas, associações produtivas, coletivos, empreendimentos solidários, redes e grupos informais. Não vira diretório genérico de empresas. `services_public` permanece copy de perfil — “esta organização trabalha com costura” — e não catálogo estruturado — “20 bolsas por R$ X”.

Preço será atributo opcional de Oferta, nunca princípio obrigatório. Venda, troca, doação, apoio, mutirão, empréstimo, cessão e cooperação permanecem modalidades possíveis a auditar em A1.

Decisões explícitas:

- `PAYMENTS_DEFERRED`;
- `ORDERS_DEFERRED`;
- `RATINGS_FORBIDDEN_FIRST_CYCLE`.

Nenhum Pix, Stripe, checkout, escrow, saldo, Wallet financeira, pedido, frete, comissão ou contratação automática entra no primeiro ciclo.

## Fluxo futuro mínimo

`Participar → Economia solidária → encontrar organização/oferta/necessidade → abrir → manifestar interesse → contato consentido → continuidade em Minha participação`.

O primeiro gesto futuro deve poder começar por “Preciso disso” ou “Posso oferecer isso”, sem exigir compreensão de cooperativa, marketplace, território, Pauta, Comunidade ou Ação.

## Decisão materializada

```json
{
  "economicSurface": "RECOMPOSE_EXISTING_COOPERATIVAS_ROUTE_AS_DISCOVERY_SURFACE",
  "organization": "REUSE_WITH_EXTENSION",
  "offer": "NEEDS_NEW_CANONICAL_OBJECT",
  "need": "REUSE_WITH_EXTENSION",
  "interest": "REUSE_CANONICAL_FOR_NEEDS_ONLY",
  "exchange": "DEFERRED_UNTIL_EXPLICIT_CONSENT_FLOW",
  "territory": "REUSE_CANONICAL_AS_OPTIONAL_CONTEXT",
  "communities": "OPTIONAL_CONTEXT_NO_CURRENT_RELATION",
  "pautas": "OPTIONAL_EXPLICIT_RELATION_NO_AUTO_CREATE",
  "actions": "NEW_LINKS_PREFER_COLLECTIVE_ACTIONS_LEGACY_KEEP_COMPAT",
  "payments": "DEFERRED",
  "orders": "DEFERRED",
  "ratings": "FORBIDDEN_FIRST_CYCLE",
  "nextSlice": "48.4-A1"
}
```

## Gates A0

- zero migration;
- zero UI/API/flag/deploy funcional;
- zero business write;
- workflow remoto `BEGIN READ ONLY`, metadata-only e `businessContentRead=false`;
- plano remoto esperado `[]`, preservando o external-ledger de Calçadas;
- contrato e testes estáticos para fronteiras, lacunas e decisões.

O estado terminal só será emitido depois do preflight remoto, CI e merge. A1 não foi iniciado.

