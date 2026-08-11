# COMUN — 48.2-D0 — Auditoria de dados ambientais

Data: 11/08/2026. Baseline: `origin/main=a9144babc0aa6ed9583b635bb1c7bd865492cc40`.

## Resultado

`COMUN_48_2_D0_ENVIRONMENTAL_DATA_CONTRACT_GREEN`

O Observatório Ambiental é uma capacidade própria do COMUN. INEA, INMET, IBGE, ANA, Prefeitura e qualquer parceiro futuro podem constar apenas como fonte, publicador, processador ou colaborador metodológico; não são nome, rota, flag, namespace, registry id, API ou identidade do produto.

Este tijolo é somente auditoria. Não criou rota, flag, migration, adapter, snapshot de produto, importação, deploy, publicação, agregado de Relata ou forwarding ambiental.

## Inventário do workspace

Não existe dataset ambiental canônico, manifest, snapshot, parser ou adapter ambiental pronto para Production. Há somente categorias privadas de Relata, catálogo de canais ambientais, ferramentas territoriais locais/legadas e um script de limite municipal IBGE. Nenhum é fonte ambiental pública pronta. `privateReportAggregate=false`: não há `SELECT`, contagem, cache ou projeção de Relata privado para D0/D1.

## Matriz de fontes

| Fonte/dataset | Publisher e processamento | Cobertura comprovada | Decisão |
| --- | --- | --- | --- |
| SIGQAr/IQAr | INEA; sem processamento COMUN | portal e metodologia oficial de índice de curto prazo; contrato máquina estável não comprovado | `PARTIAL_D1` |
| Relatório INEA 2019-2022 | INEA; sem processamento COMUN | PDF histórico da RMQAr, estações e parâmetros por período | `USE_D1` como fonte histórica revisada |
| Relatórios históricos de Volta Redonda | INEA/rede reportada; sem processamento COMUN | mencionam estações VR e parâmetros, sem provar atividade atual | `REVALIDATE` |
| Hidrometeorologia INEA | INEA; sem processamento COMUN | rede oficial com registros de 15 min e inventário anunciado | `USE_D2` |
| Estações automáticas/BDMEP | INMET; sem processamento COMUN | observações horárias e acervo histórico; estação local não selecionada | `USE_D2`, cobertura parcial |
| Malha/agregados Censo 2022 | IBGE; sem processamento COMUN | geometria e agregados públicos por setor | `USE_D3`, sem cruzamento |
| Portal da Qualidade da Água/RNQA | ANA + UFs; sem processamento COMUN | indicadores e séries 2010-2024 | `USE_LATER` para D4 |
| Dados Abertos RJ/Prefeitura | nenhum dataset ambiental aderente confirmado | sem raw dataset ou schema verificado | `REVALIDATE` |

Todos permanecem `processed=false`, sem snapshot COMUN e com `automaticPublicationAllowed=false`. Processador, versão e custódia deverão constar no manifesto futuro, sem rebatizar o publisher original.

### Campos de auditoria por fonte

- `inea-sigqar-iqar`: publisher `INEA`; `rawDatasetId=null`; processamento e
  versão `null`; fonte pública oficial, potencialmente segura após revisão;
  formato de máquina e inventário atual de estações não comprovados; há
  metodologia oficial de IQAr, cobertura operacional e freshness a capturar;
  uso recomendado `D1` somente em snapshot revisado; decisão `REVALIDATE`.
- `inea-rmqar-2019-2022`: publisher `INEA`; PDF versionado 2019--2022,
  histórico e público; sem processamento COMUN, sem near-real-time e sem
  estação atual garantida; inclui metodologia e combinações de poluentes e
  meteorologia por estação/período; geografia apenas quando publicada pela
  própria fonte; uso `D1` histórico/metodológico; decisão `USE_D1`.
- `inea-hidrometeorologia`: publisher `INEA`; catálogo/rede pública com
  registros anunciados a cada 15 minutos; sem dataset bruto, estação,
  variáveis ou período local selecionados em D0; risco de privacidade baixo
  para ponto oficial; uso `D2` após fotografia versionada; decisão `USE_D2`.
- `inmet-automaticas-bdmep`: publisher `INMET`; dados horários recentes e
  acervo anual público, sem processamento COMUN; machine-readable depende do
  mecanismo oficial escolhido; meteorologia disponível, mas estação de Volta
  Redonda e série aplicável ainda não foram selecionadas; uso `D2`; decisão
  `USE_D2` com cobertura parcial.
- `ibge-malhas-censo-2022`: publisher `IBGE`; malhas e agregados públicos por
  setor, versionados pelo Censo 2022; sem processing owner externo, sem
  near-real-time e sem medição ambiental; geografia pública de área e dados
  agregados são apropriados para cruzamento futuro sem individualização; uso
  `D3`; decisão `USE_D3`.
- `ana-rnqa-qualidade-da-agua`: publisher `ANA` com dados das UFs; portal
  público com indicadores e período 2010--2024, mas sem ponto, série, método
  de captura ou recorte local selecionado; uso posterior de qualidade da água;
  decisão `USE_LATER`.
- `dados-abertos-rj-prefeitura-vr`: publisher a confirmar; nenhum raw dataset,
  versão, schema, metodologia, licença operacional ou freshness ambiental
  aderente foi comprovado; não é fonte consumível; decisão `REVALIDATE`.

## Contrato conceitual

```ts
type EnvironmentalPublicDatasetDescriptor = {
  datasetId: string; version: string;
  domain: "air-quality" | "meteorology" | "water-quality" | "territorial-exposure";
  originalPublisher: string; sourceUrl: string; sourceKind: "official_public_data";
  rawDatasetId: string | null; processingOwner: string | null;
  processingVersion: string | null; currentCustodian: "COMUN" | null;
  retrievedAt: string; period: { start: string | null; end: string | null; reported: string };
  geography: "official_public_point" | "official_public_area";
  variables: readonly string[]; methodology: string;
  qualityState: "available" | "partial" | "missing" | "source_gap" | "station_offline_reported" | "unknown";
  publicSafe: boolean; automaticPublicationAllowed: false;
};
```

Concentração, subíndice, IQAr geral e classificação serão objetos separados. Ausência é `missing`, `source_gap` ou `unknown`, nunca zero ou “bom”. Vento é contexto meteorológico, não atribuição de emissor.

## Estações e prontidão

Os relatórios INEA confirmam combinações variáveis de PM10, PM2.5, O3, CO, NO2/NOx, SO2 e meteorologia. Nenhuma estação mede tudo por default. Registros históricos de Volta Redonda não provam status atual: `reportedStatus=unknown` até captura oficial datada. Coordenada pública, poluentes, datas e status só entram em snapshot D1 revisado.

- **D1 Qualidade do Ar: `PARTIAL_D1`.** Há fontes, IQAr e histórico oficial; falta selecionar fotografia oficial versionável com inventário atual de estações/poluentes e captura sem scraping runtime.
- **D2 Meteorologia: parcial.** INEA e INMET são fontes reais; falta selecionar estação local, variáveis e cobertura temporal.
- **D3 Exposição territorial: parcial.** IBGE sustenta geografia/dados agregados; não há cruzamento, perfil, Wallet, localização ou indivíduo.
- **D4 Água: `USE_LATER`.** ANA/RNQA exige contrato próprio de pontos, período e índices.

## Firewall e versionamento

Fluxo futuro: fonte oficial -> captura controlada -> validação -> `rawSha256` (e `semanticSha256` quando seguro) -> snapshot versionado -> adapter público. Mudança externa exige revisão, `previousSnapshotId` e novo snapshot; runtime não fará fetch ou scraping. Dados comunitários só poderão entrar por contrato futuro de projeção revisada ou agregado que preserve privacidade.

Busca de marca no diff D0: zero rota, flag, componente, API, registry id ou terminal novo usa marca externa. As fontes são citadas somente como proveniência. O diff de migrations é vazio; Production writes, fixtures, publicação, packages, attempts, ações externas e deploy são `0`.

Permanecem `COMUN_48_2_C3_REALTIME_DEFERRED_NO_PUBLIC_API_CONTRACT` e `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`. Auto-publicação OFF, mapa geral Relata OFF, coletivos OFF e `launch_publicly=false`.

Fontes: [SIGQAr/INEA](https://portalsigqar.inea.rj.gov.br/), [IQAr/INEA](https://www.inea.rj.gov.br/ar-agua-e-solo/iqar/), [relatório INEA](https://www.inea.rj.gov.br/wp-content/uploads/2024/10/Relat%C3%B3rio-de-Avalia%C3%A7ao-da-Qualidade-do-Ar-2019_2022.pdf), [INMET](https://portal.inmet.gov.br/servicos/esta%C3%A7%C3%B5es-autom%C3%A1ticas), [IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html) e [ANA](https://www.gov.br/ana/pt-br/assuntos/noticias-e-eventos/noticias/ana-lanca-portal-da-qualidade-da-agua).
