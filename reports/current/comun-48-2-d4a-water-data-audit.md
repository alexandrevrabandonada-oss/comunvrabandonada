# COMUN 48.2-D4A — Água: contrato público de dados

Data da auditoria: 12/08/2026
Natureza: auditoria e contrato de fontes oficiais; nenhum snapshot ativo, UI,
rota, API, flag, migration, deploy ou escrita Production.

## Decisão

O contrato separa permanentemente dois domínios que não podem compartilhar
medidas, índices ou interpretações:

- `surface_water_quality`: qualidade ambiental de rios e corpos hídricos;
- `drinking_water_quality`: monitoramento de água para consumo humano e
  abastecimento.

Os dois domínios ficaram `PARTIAL_D4`. Isso conclui o contrato D4A, mas não
autoriza D4B ou D4C: nenhum dado de rio é apresentado como potabilidade, e
nenhum resultado de abastecimento é tratado como medição do Rio Paraíba do Sul.

## Matriz de fontes

| Domínio | Fonte | Publisher | Dataset | ID estável | Máquina | Geometria do ponto | Data de amostra | Parâmetros | Índice | Cobertura | Último período | Risco de privacidade | Runtime | Uso recomendado | Decisão |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `surface_water_quality` | RH III — Médio Paraíba do Sul | INEA | Página oficial de boletins | URL/versionamento por hash | HTML | Não extraída | Não aplicável | Não extraídos | Aponta para boletins | RH III; relevância local requer revisão por ponto | Página consultada em 12/08/2026 | Baixo | Não; somente captura controlada | Descobrir fonte operacional e boletins | `PARTIAL_D4` |
| `surface_water_quality` | Boletim IQA RH III N12 | INEA | Boletim de Qualidade da Água RH III | `PS0419` confirmado | PDF, não tabela máquina | Não publicada no boletim auditado | Mês/dia não normalizado | Não são dados brutos neste contrato | IQA/IQANSF oficiais, metodologia da fonte | O boletim inclui `PS0419`, Rio Paraíba do Sul, Volta Redonda | 2023 | Baixo | Não | Proveniência e índice oficial, sem recálculo | `PARTIAL_D4` |
| `surface_water_quality` | Portal da Qualidade da Água / RNQA | ANA | Consolidação e metodologia nacionais | Identidade por ponto depende de captura posterior | Portal público | Não auditada em campo | Histórico informado pela fonte | Indicadores e séries oficiais | IQA e indicadores publicados | Brasil; não é duplicação independente do INEA | Portal consultado em 12/08/2026 | Baixo | Não | Metodologia e futura captura oficial documentada | `PARTIAL_D4` |
| `drinking_water_quality` | Sisagua — Controle Mensal, Parâmetros Básicos | Ministério da Saúde / Vigiagua / Sisagua | Dados abertos anuais | `waterSupplySystemId` pendente de leitura de campo | Catálogo + recursos API/CSV | Não aplicável ao contrato atual | Conforme recurso; não importado | Definidos por dicionário oficial a auditar | Não aplicável | Nacional; recorte municipal futuro pelo identificador oficial | Recursos anuais listados em 2026 | Exige auditoria de granularidade antes de incluir dados | Não | Série de controle, separada da vigilância | `PARTIAL_D4` |
| `drinking_water_quality` | Sisagua — Vigilância, Parâmetros Básicos | Ministério da Saúde / Vigiagua / Sisagua | Dados abertos anuais | `waterSupplySystemId` pendente de leitura de campo | Catálogo + recursos API/CSV | Não aplicável ao contrato atual | Conforme recurso; não importado | Definidos por dicionário oficial a auditar | Não aplicável | Nacional; recorte municipal futuro pelo identificador oficial | Recursos anuais listados em 2026 | Exige auditoria de granularidade antes de incluir dados | Não | Série de vigilância, nunca misturada ao controle | `PARTIAL_D4` |
| `drinking_water_quality` | Sisagua — Pontos de Captação | Ministério da Saúde / Vigiagua / Sisagua | Cadastro de captações | Identificador oficial ainda a confirmar | Catálogo + API documentada | Pode existir para captação; não é amostra de distribuição | Não aplicável | Cadastro, não resultado laboratorial | Não aplicável | Nacional | Catálogo consultado em 12/08/2026 | Exige auditoria de campos | Não | Identidade e infraestrutura do sistema, sem inferir qualidade | `PARTIAL_D4` |

## Superfície hídrica — resultado verificável

O boletim oficial do INEA de 2023 confirma o código `PS0419` para Volta
Redonda, no Rio Paraíba do Sul, e apresenta IQA/IQANSF como índices oficiais.
O contrato preserva esse ponto como identidade parcial (`latitude` e
`longitude` continuam `null`) e não atribui uma data exata de amostragem onde o
boletim só sustenta o período mensal/anual.

Ainda falta uma captura reproduzível do inventário completo de pontos relevantes
na RH III, com coordenadas oficiais e dados brutos por parâmetro. O portal ANA é
uma fonte nacional de consolidação/metodologia; não foi tratado como uma segunda
medição independente nem teve endpoint dinâmico inspecionado. Portanto, não há
snapshot, série, índice próprio, estado atual, conformidade legal ou alegação de
potabilidade.

## Água para consumo humano — resultado verificável

Os catálogos públicos Sisagua distinguem os módulos de `Controle` (prestador)
e `Vigilância` (saúde pública) e publicam recursos para controle mensal,
vigilância, captação e outros cadastros. O contrato mantém os dois primeiros
como proveniências diferentes; ponto de captação também permanece distinto de
ponto de amostragem de água distribuída.

Não foi promovido qualquer registro de Volta Redonda. Em especial,
`saaeVrSystemId = null`: a eventual identidade do SAAE-VR só poderá entrar por
identificador oficial Sisagua, nunca por substring de nome. Não foram lidos
laudos de moradores, contas, endereços residenciais, pessoas, relatórios de
Relata ou dados de encaminhamento. A norma de potabilidade aplicável fica para
um ciclo posterior, sem comparação numérica ou classificação legal agora.

## Proveniência, integridade e rede

As seis páginas/artefatos oficiais consultados foram armazenados apenas como
manifestos candidatos, cada um com URL HTTPS e SHA-256 bruto datado de
12/08/2026. Não há `active-snapshot`; mudança de hash cria candidato, revisão e
promoção explícita. Captura externa fica restrita a auditoria, CI ou workflow
manual. O runtime não consulta INEA, ANA, Sisagua ou SAAE.

Os testes verificam a separação de tipos, allowlist de domínios, hashes,
identidade estável de estação, identidade de sistema fail-closed, separação
entre amostra e índice, entre controle e vigilância, `null != 0`, ausência de
inferência de potabilidade/conformidade e ausência de import privado/runtime
fetch.

## Estados preservados

- `COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`;
- `COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE` e `PARTIAL_D1`;
- `PARTIAL_D2A` e `COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA`;
- `education = PARTIAL_D3B`;
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`;
- `launch_publicly=false`.

## Próxima decisão

Antes de D4B, a superfície hídrica precisa de inventário completo, coordenadas
oficiais e contrato de dados brutos ou de índice oficial com período explícito.
Antes de D4C, Sisagua precisa de leitura de dicionário/recurso que prove a
identidade oficial do sistema, o recorte público seguro e a granularidade
permitida. Nenhum desses passos está iniciado por este tijolo.

Resultado: `COMUN_48_2_D4A_WATER_DATA_CONTRACT_GREEN_DOMAINS_SEPARATED`.
