# COMUN 48.2-E0 — Serviços Essenciais: contrato público de dados

Data da auditoria: 2026-08-12
Baseline: `901ee60d84d11044c8410caf70987635b8a4beb8`

## Decisão

```json
{
  "power_distribution_continuity": "READY_E1_POWER",
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
| `power_distribution_continuity` | ANEEL, Indicadores Coletivos de Continuidade DEC/FEC | CNPJ da distribuidora + conjunto de unidades consumidoras | catálogo CKAN, ZIP/CSV/Parquet e dicionários | mensal; conjunto de unidades consumidoras com relação oficial a município | série oficial de indicadores coletivos | snapshot controlado futuro de DEC/FEC, limites, atributos e compensações | `READY_E1_POWER` |
| `water_supply_service` | SAAE-VR, comunicados públicos | identificador da notícia oficial | HTML | específico de cada aviso; rótulos de áreas afetadas quando publicados | `official_notices_only` | contrato futuro opcional de avisos, sem estatística de todos os eventos | `PARTIAL_E_WATER_OFFICIAL_NOTICES_ONLY` |
| `public_lighting_service` | PMVR/SMI, Carta de Serviços 158 e publicações de obras | URL institucional / publicação | HTML | serviço municipal ou projeto publicado | descrição de serviço e projetos, não ocorrências | responsabilidades, canal e projetos de infraestrutura separados | `PARTIAL_E_LIGHTING_SERVICE_AND_PROJECTS_ONLY` |

## Energia elétrica — continuidade da distribuição

O catálogo ANEEL informa DEC e FEC apurados e seus limites, parcelas
desagregadas, compensações e atributos dos conjuntos. A captura controlada de
12 de agosto confirmou `LIGHT SESA` (CNPJ `60444437000146`). A relação
oficial município-conjunto associa Volta Redonda a sete conjuntos: `8570`,
`8571`, `14995`, `15003`, `15007`, `15084` e `15086`. O próximo bloco deve
usar essa relação oficial, nunca semelhança de nome ou proximidade.

DEC é duração equivalente agregada por unidade consumidora; FEC é frequência
equivalente agregada. Eles não são uma lista de apagões, uma contagem de
quedas individuais, um indicador por bairro, setor censitário ou
necessariamente todo o município. O período permanece mensal e não é dado em
tempo real. Compensações preservam o significado publicado pela ANEEL, sem
atribuição a apagão específico.

O histórico publicado permite auditar comparabilidade em 12, 24 e 60 meses em
E1, mas E0 não produz tendência, juízo editorial ou snapshot ativo.

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

Como energia está `READY_E1_POWER`, o próximo bloco elegível é somente
**48.2-E1 — Continuidade da Energia: snapshot ANEEL**. Este E0 não inicia E1.

Resultado: `COMUN_48_2_E0_ESSENTIAL_SERVICES_PUBLIC_DATA_CONTRACT_GREEN`.
