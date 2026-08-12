# COMUN 48.2-D3B2 — Equipamentos públicos de Assistência Social

Data da captura: 12/08/2026 (America/Sao_Paulo)

Baseline: `origin/main=690c3d707ec4d3c21bb4d871589887cc5ee1fa29`

Natureza: snapshot oficial, versionado e public-safe. Não há UI, API, flag,
migration, deploy, consulta runtime a fonte externa ou escrita Production.

## Decisão

`READY_D3C_SOCIAL_ASSISTANCE`

A fotografia ativa contém 16 unidades de Assistência Social municipal cuja
identidade CadSUAS, presença no diretório público da SMAS e atividade municipal
recente puderam ser corroboradas. O conjunto é intencionalmente menor que os
89 registros do CadSUAS: ausência de prova suficiente exclui o item, não o
inclui por aproximação.

## Fontes e proveniência

| Fonte | Papel | rawSha256 | semanticSha256 |
| --- | --- | --- | --- |
| CadSUAS consulta externa | identificador estável e nome oficial | `173307518cc20208ec258693aae1567b0732df83cb1c89e152a9440d887b70f7` | `c6edad807aa529ba438ef28048b147f222c05a666c940f790aa98c6d555b59c8` |
| Diretório SMAS | gestão municipal e endereço público | `f32c8283dbba59c7d0b73a031782ea28a6d3d05ef09cd6a44c10f630ae6549ff` | `9b8f81372fa2b5a7d155d03ebe41e3eb9960df2024cb0e59a3006e09a1f7b320` |
| publicação SMAS/PMVR sobre CRAS | evidência recente de atividade | `e4e8f710ae382d2f52356052b5c32d39986753e1ae815c4a2144cf9b6f716e87` | `02a12afc5e87ec2c15df13c077b8e96718145e242ed7713e8388a0521926df40` |
| publicação SMAS/PMVR sobre CREAS | evidência recente de atividade | `fe77c8538c223b1a0dd4a42e550ce9d1bb49ce96adafc258f1722680a855bf00` | `6bbe6ca9df29669c5ce0c567ff8d3a33acfc26e028441dd5a8b847285ec8a201` |

O runtime importa apenas o snapshot versionado. A captura externa é isolada no
script controlado; uma falha de TLS local no Node não reduz a verificação: a
captura promovida foi feita com transporte HTTPS confiável do ambiente local,
sem credencial, e os artefatos brutos ficaram fora do repositório.

## Critério fail-closed

- identidade: `social-assistance:cadsuas:<codigo>`;
- município: somente Volta Redonda (`3306305`);
- gestão: somente `public_municipal` comprovada pela SMAS;
- status: somente `active_reported` por publicação municipal recente;
- tipo presente: 15 CRAS e 1 CREAS;
- endereço: somente quando publicado no diretório da SMAS;
- coordenadas: nenhuma; todos os registros são `address_only`;
- vínculo com setor: sempre `not_applicable_address_only`.

O Centro POP não entrou porque fontes oficiais acessíveis apresentaram endereços
divergentes. Esse conflito não é resolvido por escolha silenciosa. Itens sem
corroboração municipal ou sem atividade comprovada também permanecem fora.

## Diagnósticos

| Etapa | Contagem |
| --- | ---: |
| registros CadSUAS no recorte municipal | 89 |
| registros incluídos após corroboração | 16 |
| gestão pública municipal e atividade reportada | 16 |
| endereço público | 16 |
| endereço restrito/desconhecido | 0 / 0 |
| ponto oficial | 0 |
| vínculo de setor | 0 |
| excluídos por ausência de corroboração suficiente | 73 |
| conflitos conhecidos não promovidos | 1 |

## Artefatos e validação

- `data/comun/environment/public-equipment/social-assistance/active-snapshot.json`;
- `data/comun/environment/public-equipment/social-assistance/social-assistance-equipment-v1-20260812.json`;
- `data/comun/environment/public-equipment/social-assistance/source-manifest-v1.json`;
- `scripts/environment/capture-comun-public-social-assistance-equipment.mjs`;
- `lib/comun-environment-public-social-assistance-equipment.ts`.

O validador garante hashes e domínios oficiais, identidade CadSUAS única,
gestão pública, status ativo, endereço restrito nulo, ausência de geocoding e
ausência de setor. O diff versionado detecta adição, remoção, nome, tipo,
gestão, endereço, publicação do endereço e status; nenhuma captura futura é
auto-promovida.

## Firewall e limites

- zero Relata, Wallet, conta, localização privada, anexos, forwarding ou dados
  de usuários do SUAS;
- zero telefone, e-mail, pessoas atendidas, famílias ou dados operacionais no
  snapshot;
- zero geocoding, reverse geocoding, mapa, cobertura, distância ou suficiência;
- zero cruzamento com poluição, chuva, rios ou exposição ambiental;
- Educação permanece `PARTIAL_D3B` e não foi alterada.

Permanecem:

`COMUN_48_2_D3A_ENVIRONMENTAL_EXPOSURE_DEFERRED_NO_CURRENT_ENVIRONMENTAL_LAYER`

`COMUN_48_2_D1A_BLOCKED_CURRENT_OFFICIAL_SOURCE_UNAVAILABLE`

`PARTIAL_D1`

`PARTIAL_D2A`

`COMUN_48_2_D2A_NO_OPERATIONAL_STATION_IN_VOLTA_REDONDA`

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`

## Resultado

`COMUN_48_2_D3B2_PUBLIC_SOCIAL_ASSISTANCE_EQUIPMENT_SNAPSHOT_GREEN_OFFICIAL_ONLY`
