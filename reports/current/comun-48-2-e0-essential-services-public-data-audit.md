# COMUN 48.2-E0 — Serviços Essenciais: contrato público de dados

Data da auditoria: 2026-08-12
Baseline: `901ee60d84d11044c8410caf70987635b8a4beb8`

## Decisão

```json
{
  "power_distribution_continuity": "PARTIAL_E1_POWER",
  "water_supply_service": "PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY",
  "public_lighting_service": "PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY"
}
```

E0 fecha apenas o contrato, os descritores candidatos e a decisão de
prontidão. Não há interface, rota, API, flag, migration, deploy, escrita em
Production ou captura em runtime.

## Matriz de fontes e uso permitido

| Domínio | Fonte oficial auditada | Identidade estável | Formato | Tempo / geografia | Completude | Uso recomendado | Decisão |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `power_distribution_continuity` | ANEEL, Indicadores Coletivos de Continuidade DEC/FEC | CNPJ da distribuidora + conjunto de unidades consumidoras | catálogo CKAN, ZIP/CSV/Parquet e dicionários | mensal por conjunto; a relação municipal capturada é somente uma materialização atual | série oficial de indicadores, sem associação municipal histórica comprovada | retenção de evidência candidata; nenhum snapshot municipal ativo | `PARTIAL_E1_POWER` |
| `water_supply_service` | SAAE-VR, comunicados públicos | identificador da notícia oficial | HTML | específico de cada aviso; rótulos de áreas afetadas quando publicados | `official_notices_only` | contrato futuro opcional de avisos, sem estatística de todos os eventos | `PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY` |
| `public_lighting_service` | PMVR/SMI, Carta de Serviços 158 e publicações de obras | URL institucional / publicação | HTML | serviço municipal ou projeto publicado | descrição de serviço e projetos, não ocorrências | responsabilidades, canal e projetos de infraestrutura separados | `PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY` |

## Energia elétrica — continuidade da distribuição

O catálogo ANEEL informa DEC e FEC apurados e seus limites, parcelas
desagregadas, compensações e atributos dos conjuntos. A captura controlada de
12 de agosto confirmou `LIGHT SESA` (CNPJ `60444437000146`). O E0 registrou
sete identidades como baseline de sanidade, mas o E1 verificou que a relação
município–conjunto efetivamente capturada é apenas uma materialização de
2026-08-05. Ela não prova membership histórico dos conjuntos e não pode ser
aplicada à série de 2020–2026.

DEC é duração equivalente agregada por unidade consumidora; FEC é frequência
equivalente agregada. Eles não são uma lista de apagões, uma contagem de
quedas individuais, um indicador por bairro, setor censitário ou
necessariamente todo o município. O período permanece mensal e não é dado em
tempo real. Compensações preservam o significado publicado pela ANEEL, sem
atribuição a apagão específico.

Os indicadores publicados permanecem candidatos versionados, mas não permitem
comparabilidade municipal em 12, 24 ou 60 meses sem relação oficial válida no
mesmo período. E0/E1 não produzem tendência, juízo editorial ou snapshot ativo.

## Abastecimento de água — avisos oficiais, não série completa

`water_supply_service` permanece absolutamente separado de
`drinking_water_quality` e de `surface_water_quality`. Foram validados
comunicados oficiais do SAAE-VR como fontes public-safe, inclusive um caso de
interrupção de tratamento com retomada gradativa e um caso cuja causa oficial
é dependência de energia. Isso não transforma o aviso em evento elétrico: ele
continua sendo um aviso de abastecimento.

Não foi estabelecido um registro público sistemático e completo de todas as
interrupções, manutenções e retomadas. Assim, não é legítimo calcular total
anual de faltas d'água, taxa de retomada ou mapa de eventos. Um futuro
`WaterSupplyOfficialNotice`, se for explicitamente revisado, deverá preservar
separadamente início informado, previsão de retomada, retomada efetivamente
informada e o estado de retomada gradativa. Rótulo de bairro é apenas texto
publicado, não limite analítico nem vínculo a setor censitário.

## Iluminação pública — serviço e projetos, não performance

A Carta de Serviços 158 confirma a responsabilidade municipal e o canal
Fiscaliza VR. A previsão de realização de 30 dias foi registrada somente como
estimativa administrativa do serviço: não é SLA, prazo legal, média de
resolução nem inventário de chamados. O conteúdo do Fiscaliza VR não foi
consultado nem tratado como dataset.

Uma publicação de 2026 sobre a revitalização da iluminação da Beira-Rio
qualifica um possível descritor de projeto público: localização textual,
investimento, postes/luminárias e previsão publicados. Projeto de implantação
ou revitalização não é incidente de manutenção e não pode compor indicador de
luminárias apagadas. Não há fonte pública sistemática suficiente para criar
inventário de postes, fila de chamados, porcentagem resolvida ou desempenho do
serviço.

## Proveniência, firewall e drift

Os hashes brutos, URLs oficiais, formatos e limitações estão em
`data/comun/essential-services/essential-services-public-data-contract-v1.json`.
O runtime público não consulta ANEEL, SAAE-VR ou PMVR: qualquer atualização
futura ocorre por captura controlada, hash, comparação, revisão e promoção
explícita de candidato. Não há auto-update.

O contrato aceita somente `official_public_data` e não importa nem lê Relata,
Carteira, conta, localização privada, anexos ou encaminhamento. Não existe
agregado de relato privado. A separação D4A permanece: qualidade de água para
consumo continua `PARTIAL_D4`.

## Limitações e próximo passo

- `COMUN_48_2_D4A_WATER_DATA_CONTRACT_GREEN_DOMAINS_SEPARATED` permanece
  preservado; E0 não reabre Sisagua nem qualidade da água para consumo.
- Água e iluminação não recebem indicadores fabricados enquanto suas fontes
  continuarem incompletas.
- `COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION` permanece pausado.
- auto-publicação, mapa geral Relata e coletivos permanecem OFF;
  `launch_publicly=false`.

O E1 revisou a prontidão preliminar de energia de `READY_E1_POWER` para
`PARTIAL_E1_POWER` depois que a materialização revelou a ausência de relação
município–conjunto válida por período. Isso é correção metodológica, não
regressão de produto. Uma revisão futura exige fonte temporalmente válida;
nenhum Observatório de energia é iniciado antes disso.

Resultado: `COMUN_48_2_E0_ESSENTIAL_SERVICES_PUBLIC_DATA_CONTRACT_GREEN`.
