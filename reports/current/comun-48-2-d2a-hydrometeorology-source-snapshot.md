# COMUN - 48.2-D2A - Snapshot de inventário hidrometeorológico

Data da auditoria: 11/08/2026. Baseline: `origin/main=d98dc83c00b29334bca8aa4fe86b1b5ffeebc786`.

## Decisão

`PARTIAL_D2A`

`COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA`

O inventário operacional oficial está disponível e foi versionado de forma normalizada. A publicação de leituras atuais não apresentou contrato público estável e auditável sem depender do mapa dinâmico. Por isso não existe active snapshot de medições e não é emitido `COMUN_48_2_D2A_HYDROMETEOROLOGY_OFFICIAL_SNAPSHOT_GREEN`.

## Fontes e captura

| Fonte | Formato | HTTP/content type | retrievedAt | rawSha256 |
| --- | --- | --- | --- | --- |
| Página INEA Monitoramento Hidrometeorológico | HTML público estável | 200 / HTML | `2026-08-11T23:03:28.137Z` | `297f00d82824aa6d03dca8ffe90de32fbde5b03e006d4a215e352481effb8734` |
| Inventário das Estações Hidrometeorológicas em Operação | XLSX oficial | 200 / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `2026-08-11T23:01:15.442Z` | `57336c34972860bc62bcd3b7695f2258b7934c92a77111c0be06b6cd1eeebc42` |

O XLSX possui uma planilha `INVENTÁRIO`, 108 registros e 14 colunas: códigos ANA pluviométrico e fluviométrico, nome, tipo, rio, região hidrográfica, RH, bacia, município, latitude, longitude, integração ao Alerta, Rede Básica e data de implantação. A página oficial o apresenta atualmente como inventário de estações em operação; por isso o status normalizado é `operational_reported`. O arquivo não informa uma data própria de atualização, então `sourceReportedAt=null` e freshness da fonte permanece desconhecida.

## Recorte territorial

O inventário contém zero estações no município de Volta Redonda e cinco na Região Hidrográfica III - Médio Paraíba do Sul:

| Estação | Município | Rio | Códigos plu/flu | Variáveis comprovadas | Coordenada pública oficial |
| --- | --- | --- | --- | --- | --- |
| Fazenda Escola UBM | Barra Mansa | Rio Barra Mansa | 2244167 / 58288000 | chuva, nível | -22.597167, -44.169806 |
| Javary | Miguel Pereira | Rio do Saco | 2243511 / 58375000 | chuva, nível | -22.468278, -43.490056 |
| Rialto | Barra Mansa | Rio Bananal | 2244168 / 58286800 | chuva, nível | -22.585667, -44.269028 |
| Rio das Flores | Rio das Flores | Ribeirão Manoel Pereira | 2243292 / 58583000 | chuva, nível | -22.168500, -43.587139 |
| Visconde de Mauá | Resende | Rio Preto | 2244169 / 58525100 | chuva, nível | -22.329972, -44.538806 |

Todas são `Plu/Flu`. Isso comprova capacidade publicada para `rainfall` e `river_level`, vinculada a cada estação. Não comprova valor atual, unidade, período de acumulação, horário da medição ou estado de alerta. `flow` não foi incluído: a página institucional menciona campanhas de vazão em parte da rede, não uma variável corrente do inventário.

## Publicação atual e histórico

A página institucional declara registros a cada 15 minutos, chuva, nível d'água, tempo real e geração de dados históricos. O intervalo de 15 minutos foi preservado apenas como metadata da rede; não foi transformado em `mm/15min` ou granularidade de cada métrica.

O mapa público do Alerta de Cheias é dinâmico e não respondeu à captura HTML controlada dentro de 45 segundos. Não houve DevTools, inspeção de rede, descoberta de endpoint, token, cookie, leitura de JavaScript ou engenharia reversa. Sem documento/download atual estável, `measurements=[]`.

O acesso histórico foi comprovado como capacidade institucional, mas nenhum período pequeno reproduzível foi importado neste ciclo. A documentação oficial orienta acesso pela superfície do Alerta de Cheias e por solicitação ao INEA; isso não é substituto para um snapshot current.

## Artefatos versionados

- `data/comun/environment/hydrometeorology/operational-inventory-v1-20260811.json` contém somente o recorte oficial RH III, com `voltaRedondaStationCount=0`, estações, variáveis e limitações;
- `data/comun/environment/hydrometeorology/source-manifest-v1.json` fixa publisher, URLs, hashes, timestamps e parser version;
- não existe `active-snapshot.json`: criar esse ponteiro sugeriria medições atuais verificadas que a fonte não sustentou;
- o runtime não acessa INEA nem Alerta de Cheias; a camada não tem rota, API, flag ou componente público.

## Segurança e semântica

- `rainfall` e `river_level` ausentes permanecem `null`, nunca zero;
- `delayed` é estado de dado e não é convertido em `offline_reported`;
- nível não é convertido em risco, cheia ou transbordamento sem regra oficial;
- o inventário versionado suporta diff de estação adicionada/removida, status, município, coordenada e variáveis;
- D2A usa `official_public_data only`; Relata, `urban_flooding`, drenagem, localização privada, anexos, Carteira, forwarding e conta não são importados;
- INEA é apenas `originalPublisher`. O dataset e o produto mantêm identidade COMUN.

## Próxima condição

D2A pode avançar a `READY_D2A_PUBLIC` quando a fonte oficial oferecer leitura atual por documento, download ou endpoint explicitamente público/documentado que permita validar estação, variável, valor, unidade, `measurementObservedAt` e freshness. Até lá, a UI de Chuva e Rios permanece fechada e D1A continua bloqueado independentemente deste inventário.

Fontes: [Monitoramento Hidrometeorológico/INEA](https://www.inea.rj.gov.br/ar-agua-e-solo/monitoramento-hidrometeorologico/), [Sistema de Alerta de Cheias](https://alertadecheias.inea.rj.gov.br/sobre.php), [Mapa público das estações](https://alertadecheias.inea.rj.gov.br/mapa.php) e [perguntas frequentes do INEA](https://www.inea.rj.gov.br/perguntas-frequentes/).
