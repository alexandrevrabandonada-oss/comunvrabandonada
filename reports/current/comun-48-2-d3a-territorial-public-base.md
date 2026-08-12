# COMUN - 48.2-D3A - Base Territorial Pública

Data da auditoria: 11/08/2026. Baseline: `origin/main=1a231376b63afb23f85a9eb91e5003f0a769e9f4`.

## Decisão

`READY_D3B`

`COMUN_48_2_D3A_TERRITORIAL_PUBLIC_BASE_GREEN_IBGE_AGGREGATED_ONLY`

A malha oficial de setores censitários definitivos do Censo 2022 foi recortada para Volta Redonda e versionada com dois agregados básicos documentados: total de pessoas (`V0001`) e total de domicílios (`V0002`). A base descreve territórios censitários e seus totais agregados; não mede exposição, risco, vulnerabilidade ou impacto ambiental.

## Fontes e captura

| Fonte | Uso | HTTP/content type | retrievedAt | rawSha256 |
| --- | --- | --- | --- | --- |
| Malha de setores do RJ com atributos básicos | geometria e agregados por setor | 200 / `application/zip` | `2026-08-12T00:07:42.557Z` | `59e79f1e87b6f21c798baabdfb09a9b0beb2f812e26d0eda9fddc6144e375f8d` |
| Dicionário dos agregados por setores | definição oficial de `V0001` e `V0002` | 200 / XLSX | `2026-08-12T00:09:32.410Z` | `0b8aedece57f6125d785b6aa2234cfd587e92dfb6ce5ca6ace8c67f140831344` |
| Agregados básicos por município | diagnóstico do total municipal compatível | 200 / `application/zip` | `2026-08-12T00:12:08.570Z` | `0adc228eba0869dfbc2487e19481b96acabe5c2537a2837f1d5235a8dc0232c5` |

Publisher original: IBGE. Dataset: Censo Demográfico 2022, setores definitivos. Os binários de origem não foram commitados; o repositório guarda URL oficial, hash bruto, metadata e a extração normalizada bounded de Volta Redonda.

## Recorte e integridade

- município oficial: Volta Redonda/RJ, código `3306305`;
- 739 setores no recorte e 739 códigos únicos;
- identificador canônico: `ibge:census-sector:<CD_SETOR>`;
- todas as geometrias são `Polygon`, não vazias, fechadas e com coordenadas finitas;
- CRS da fonte: SIRGAS 2000, EPSG:4674;
- saída normalizada: longitude/latitude RFC 7946, sem simplificação, fusão ou eliminação de setor;
- bounds diagnósticos: longitude de aproximadamente -44,1560 a -44,0026 e latitude de -22,6406 a -22,4063;
- nenhum código ausente, duplicado ou atribuído a outro município.

O snapshot mantém um hash normalizado por geometria para permitir diff futuro independente de whitespace ou container ZIP. O hash bruto do ZIP continua sendo a prova da fonte capturada.

## Agregados incluídos

| Campo COMUN | Variável IBGE | Definição oficial preservada | Unidade | Ausentes |
| --- | --- | --- | --- | --- |
| `populationTotal` | `V0001` | Total de pessoas | pessoas | 0 setores |
| `householdsTotal` | `V0002` | Total de domicílios: DPPO + DPPV + DPPUO + DPIO + DCCM + DCSM | domicílios | 0 setores |

Valores ausentes ou suprimidos continuam `null`; zero só é preservado quando publicado como zero. Não foram adicionados renda, raça/cor, idade, deficiência, saneamento, alfabetização ou qualquer outra variável social.

## Reconciliação municipal

| Diagnóstico | Soma dos setores | Referência municipal compatível | Resultado |
| --- | ---: | ---: | --- |
| Pessoas (`V0001`) | 261.563 | 261.563 | igual |
| Domicílios (`V0002`) | 115.652 | 115.652 | igual |

Essa soma é somente um teste de integridade do universo selecionado. Não cria indicador público nem substitui as definições do IBGE.

## Artefatos versionados

- `data/comun/environment/territory/active-snapshot.json` fixa a versão ativa;
- `data/comun/environment/territory/territorial-base-v1-20260811.json` contém metadata e os 739 setores;
- `data/comun/environment/territory/source-manifest-v1.json` registra publisher, URLs, formatos, timestamps e hashes;
- `data/comun/environment/territory/aggregate-definitions-v1.json` limita o contrato a `V0001` e `V0002`;
- `scripts/solo/build-territorial-public-base.mjs` reproduz a extração a partir dos artefatos oficiais locais e falha se qualquer hash divergir;
- `lib/comun-environment-territorial-base.ts` valida fontes, geografia, agregados, contagens e drift sem rede runtime.

## Privacidade e firewall

D3A usa exclusivamente dados censitários públicos agregados. Não lê ou importa Relata, Carteira, localização privada, anexos, forwarding, conta, saúde, educação ou proteção de crianças. Não existem microdados, pessoa, CPF, endereço domiciliar ou coordenada residencial.

Setor censitário não é bairro. A base não resolve silenciosamente o débito de analytics por bairro de Calçadas e não executa reverse geocoding. Equipamentos públicos permanecem fora deste snapshot e serão auditados separadamente em D3B.

## Limitações e adiamentos

- nenhuma densidade foi calculada;
- nenhum índice social ou composto foi criado;
- nenhuma estação hidrometeorológica D2A foi incorporada;
- D1A continua bloqueado por ausência de fonte oficial atual adequada;
- não existe UI, API, mapa, flag, migration, deploy ou consulta runtime ao IBGE;
- a publicação automática permanece desligada.

`COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`

## Próximo passo autorizado

`48.2-D3B - Equipamentos e serviços públicos no território`, com fontes oficiais próprias e sem alterar a base censitária. Qualquer contexto ambiental cruzado permanece reservado a D3C, depois de existir camada ambiental metodologicamente adequada.

Fontes: [Censo 2022 - Agregados por Setores Censitários](https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados), [malha oficial de setores do RJ](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/setores/shp/UF/RJ/) e [Malhas de Setores Censitários](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html).
