# COMUN — 48.2-C0 — auditoria de dados do transporte

Data da auditoria: 11/08/2026. Baseline: `origin/main=457bfc3bc2b81e356e3a610166cd532d1ba38ad9`.

## Resultado

`COMUN_48_2_C0_TRANSPORT_DATA_CONTRACT_GREEN`

Esta é uma auditoria de contrato. Não criou rota, flag, migration, importação,
cache público, fixture ou escrita em Production. Também não leu conteúdo de
relatos, Carteira, localização, anexos, sessões ou encaminhamentos.

## Limite privado: confirmado

| Origem auditada | Classificação | Evidência de limite | Decisão |
| --- | --- | --- | --- |
| 48.0E local: autoridades, operadores, linhas, pontos, calendários, versões, horários, viagens, sessões/ eventos de espera, observações, rascunhos e snapshots | `historical_local_private` | `supabase/local-migrations/20260804002757_comun_bus_foundation.sql` está no manifesto de quarentena como `localOnly`, `fixture` e `promotionForbidden`; as tabelas são `private` e têm revogação para público. | `REJECT` como fonte de Production/C1; conceitos e funções puras podem ser estudados. |
| P5: `private.comun_bus_relata_intakes` | `private_operational` | A migration Production P5 força RLS, revoga `public`, `anon` e `authenticated`, e só concede a `service_role`. | `REJECT` para Observatório. |
| P5: casos `public_transport`, Carteira, packages, attempts e events STMU | `private_operational` | O fluxo autentica pela Carteira/token e as tabelas de forwarding são privadas, RLS/FORCE RLS e service-role-only. | `REJECT` para contagem, mapa, card, cache ou API pública. |

Em particular, a auditoria não propõe selecionar, agregar ou expor intakes,
reports, cases, Carteira, textos, sessões de espera, observações locais,
packages ou attempts. A separação P5 continua absoluta.

## Matriz de fontes externas

| Fonte / proprietário | sourceKind | Público | machineReadable | Histórico / tempo real / geografia | Frequência / proveniência | Risco de privacidade | Qualidade | Uso recomendado | Decisão |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Catálogo municipal de horários e itinerários](https://www.voltaredonda.rj.gov.br/horario-de-onibus/) — PMVR/STMU | `official_public_data` | sim | HTML com links PDF | rede programada; não tempo real | página oficial; cada PDF carrega Ordem de Serviço, atualização e vigência | baixo | fonte primária; sujeita a alteração operacional | catálogo C1 e origem dos artefatos | `USE_C1` |
| PDFs oficiais de horários — PMVR/STMU | `official_public_document` | sim | PDF textual, não feed | horários programados | URL + hash + O.S. + vigência preserváveis | baixo | estruturado o bastante para parser determinístico, com revisão de variantes | rede programada C1 | `USE_C1` |
| PDFs oficiais de itinerário — PMVR/STMU | `official_public_document` | sim | PDF textual | sequência de vias/terminais | URL + hash + O.S. + vigência preserváveis | baixo | estrutura legível; paradas não são dataset geográfico | itinerário textual C1 | `USE_C1` |
| [Estudo tarifário 2026](https://mobilidadeurbana.voltaredonda.rj.gov.br/storage/posts/68/files/rApvDXuPmUrNRm8BwxDjFwDWZeMoB9fGDIiiTwzH.pdf) e [reunião COMUTRAN](https://mobilidadeurbana.voltaredonda.rj.gov.br/comutran-realiza-primeira-reuniao-extraordinaria-de-2026-para-discutir-tarifa-e-mobilidade-urbana) — STMU | `official_public_document` | sim | PDF + página; não API | estudo/tarifa, não operação por viagem | documento com data e publicação institucional | baixo | primário para explicação de sistema; não é série operacional | números/contexto C2 após contrato próprio | `USE_C2` |
| [Decreto 19.858/2026](https://www.voltaredonda.rj.gov.br/images/Documentos/VRDestaques/2024/2026-01-30_2285-extra.pdf) — PMVR/VR em Destaque | `official_public_legal_record` | sim | PDF | tarifa vigente a partir de 01/02/2026 | número, data e edição identificáveis | baixo | ato oficial; não usar como previsão de tarifa futura | referência tarifária C2 | `USE_C2` |
| [Tarifa Zero](https://mobilidadeurbana.voltaredonda.rj.gov.br/tarifa-zero) e [Carta de Serviços](https://servicos.voltaredonda.rj.gov.br/cartaServicos/568/) — PMVR | `official_public_service` | sim | HTML | serviço próprio, não substituto da rede convencional | páginas institucionais, com horários/pontos declarados | baixo | deve ser modelado separadamente, inclusive por ser gratuito | serviço específico futuro | `DEFER` |
| [VRBus](https://www.voltaredonda.rj.gov.br/comunicacao/noticias/41-stmu/6358-volta-redonda-passa-a-contar-com-aplicativo-pr%C3%B3prio-para-usu%C3%A1rio-conferir-hor%C3%A1rios-de-%C3%B4nibus/) / CittaMobi anunciado — PMVR/STMU | `official_public_app_announcement` | sim | não há contrato de dados documentado | promete horários/chegadas e mapa de pontos em tempo real | notícia institucional, não especificação de API | baixo | prova existência do serviço ao usuário, não autorização de integrar dados | somente link informativo | `DEFER` |
| Relatórios públicos STMU de 2024 e 2025 | `official_public_report` | não localizado como relatório periódico/reutilizável | não | sem série pública identificada | busca read-only no portal oficial; não substituir por notícias ou queixas | baixo | ausência de contrato/dataset | não calcular tendência, desempenho ou total | `DEFER` |
| [Fiscalização de acessibilidade de 2026](https://mobilidadeurbana.voltaredonda.rj.gov.br/stmu-realiza-fiscalizacao-de-rampas-de-acessibilidade-em-onibus-do-transporte-coletivo) — STMU | `official_public_report` | sim | HTML narrativo | amostra de fiscalização, não série completa | publicada em 12/02/2026; não contém microdados reutilizáveis | baixo | útil como contexto, não indicador recorrente | C2 somente se séries oficiais forem publicadas | `DEFER` |
| Dados geográficos de pontos | — | não encontrados em formato oficial reutilizável | não | faltam `stopId`, nome, latitude, longitude e linhas atendidas | — | — | a notícia do app cita mapa, mas não publica dataset | não criar pontos por geocoding/scraping | `DEFER` |

Fontes consultadas são somente PMVR/STMU e Diário Oficial municipal. Fontes
secundárias não foram usadas para preencher campos operacionais.

## Contrato de catálogo público proposto para C1

Cada linha só poderá entrar a partir do catálogo municipal oficial, com os
campos mínimos:

```text
operator, lineCode, lineLabel, timetableUrl, itineraryUrl,
sourceKind="official_public_data"
```

Não haverá importação de 48.0E nem conversão de IDs privados. Operadora e
linha precisam ser reavaliadas a cada versão: intervenção operacional recente
na Viação Pinheiral demonstra que nome de operadora não pode ser tratado como
atributo imutável.

### Amostra de PDFs de horários

| Operadora / linha | Campos comprovados | Limite de parsing |
| --- | --- | --- |
| [Elite / 205A](https://www.voltaredonda.rj.gov.br/horario-onibus/Via%C3%A7%C3%A3o%20Elite/Linha%20205A%20-%20Morada%20da%20Colina%20x%20Padre%20Josimo/Linha%20205A%20-%20hor%C3%A1rios.pdf) | `lineCode=205A`, rótulo, O.S. 010/2025, atualização 21/01/2025, vigência 27/01/2025, dias úteis e sábado, partidas por origem e notas A–D. | O PDF não apresenta domingo/feriado na amostra; ausência deve continuar ausência, sem completar por inferência. |
| [Cidade do Aço / 125](https://www.voltaredonda.rj.gov.br/horario-onibus/Via%C3%A7%C3%A3o%20Cidade%20do%20A%C3%A7o/Linha%20125%20-%20Ponte%20Alta%20x%20Roma%20I/Linha%20125%20-%20hor%C3%A1rios.pdf) | `lineCode=125`, rótulo, O.S. 002/2026, atualização 30/01/2026, vigência 02/02/2026, dias úteis, sábado e domingo, partidas por origem. | O cabeçalho/grade deve ser associado por posição; parser deve preservar lacunas e não supor equivalência entre origens. |
| [Pinheiral / 210](https://www.voltaredonda.rj.gov.br/horario-onibus/Via%C3%A7%C3%A3o%20Pinheiral/Linha%20210%20-%20Tr%C3%AAs%20Po%C3%A7os%20x%20Conforto/Linha%20210%20-%20hor%C3%A1rios.pdf) | `lineCode=210`, O.S. 046/2026, atualização 25/06/2026, vigência 29/06/2026, dias úteis, sábado e domingo/feriado, origens e variantes A–C. | Há horários após meia-noite e variantes; o artefato precisa guardar `serviceDayOffset` e nota original. |

O contrato normalizado deve suportar, sem adivinhar: `lineCode`, `routeLabel`,
`orderNumber`, `sourceUpdatedAt`, `effectiveFrom`, partidas de dias úteis,
sábado e domingo/feriado, origem/direção, variantes e notas. Campos ausentes
no documento permanecem `null`/não publicados.

### Itinerários

A amostra oficial 230 prova a estrutura: linha/rótulo, Anexo II, Ordem de
Serviço, atualização, vigência, terminal/origem e listas ordenadas de vias por
sentido, inclusive variante dominical. Em C1, o parser deve emitir apenas uma
sequência textual pública por variante; não deve fingir que a lista de vias é
um conjunto de pontos, uma geometria ou uma tabela de tempos de parada.

## Versionamento e qualidade

Identidade recomendada de uma versão de artefato:

```text
sourceUrl + sourceHash + orderNumber + effectiveFrom + retrievedAt
```

`sourceHash` é calculado sobre o artefato obtido. Um URL que passa a apontar a
outro PDF cria outra versão; nunca sobrescreve a proveniência de uma anterior.
Conflito de O.S., data ou conteúdo deve ficar `conflicting_sources`, não ser
resolvido por heurística silenciosa.

## Tempo real, pontos e relatórios

- `COMUN_48_2_C0_REALTIME_DEFERRED_NO_PUBLIC_API_CONTRACT`: a PMVR anuncia
  VRBus/CittaMobi e uso em tempo real, mas a auditoria não encontrou API,
  GTFS ou GTFS-Realtime oficial documentado. Não houve inspeção de app,
  DevTools, APK, endpoint privado ou scraping.
- `COMUN_48_2_C0_PUBLIC_STOPS_DATASET_NOT_FOUND`: não foi localizado dataset
  oficial com `stopId,name,lat,lon,servedLines`. A lista histórica de QR codes
  não satisfaz o contrato e não deve virar geografia do Observatório. Isto não
  bloqueia C1.
- A busca read-only do portal oficial não localizou relatório periódico ou
  dataset reutilizável de transporte para 2024/2025. Para 2026, a fonte
  localizada é uma notícia de fiscalização, em HTML narrativo, datada de
  12/02/2026. Ela informa fiscalização em 04/02/2026 de 12 veículos, cerca de
  10% da frota então em circulação. Não é relatório de frota, não tem
  microdados e não fornece denominador estável para indicador do sistema.
  Relatório futuro só será elegível se publicar período, unidade,
  metodologia, privacidade e possibilidade de agregação.
- A notícia/reunião de 21/01/2026 confirma estudo tarifário e encaminhamento
  para 2026. O decreto 19.858 define valor e vigência; o estudo técnico é
  documento separado. Nenhum dos dois deve ser confundido com tarifa em tempo
  real ou desempenho de linhas.

## Recomendação de sequência

1. **C1 — rede programada:** usar um manifesto versionado no repositório que
   liste artefatos oficiais e seus hashes. É a escolha mínima e auditável: não
   cria schema genérico, não importa dados históricos e permite revisão do
   parser antes de qualquer persistência pública futura.
2. **C2 — números/contexto do sistema:** só métricas oficiais com período,
   unidade, denominador e metodologia explícitos (tarifa, estudo, frota ou
   fiscalização quando publicados como série).
3. **C3 — tempo real:** somente após contrato oficial `documented_official_api`,
   `documented_gtfs` ou `documented_gtfs_realtime`.
4. **C4 — experiência comunitária:** apenas em tijolo posterior, agregada e
   editorialmente segura. Não reutilizar Relata, P5/STMU, Carteira ou 48.0E.

## Escopo exato de C1 (ainda não implementado)

C1 pode construir catálogo e leitor de documentos oficiais, com manifestos,
artefatos hashados, parser determinístico, URL/proveniência e interface de
leitura pública. Não pode criar Observatório de experiência, indicadores de
atraso, mapa de paradas, real-time, integração com VRBus, importação P5/48.0E
ou qualquer escrita em dados de negócio.

## Evidências de schema e estado

- `git diff origin/main...HEAD -- supabase/migrations` no início: vazio.
- Esta branch não altera `supabase/migrations`; plano do tijolo: `[]`.
- Não há migração 48.0E em `supabase/migrations`: a migração histórica local
  continua apenas no manifesto de quarentena, com promoção proibida.
- O estado humano permanece
  `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.
