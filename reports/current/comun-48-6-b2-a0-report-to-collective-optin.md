# COMUN 48.6-B2-A0 — Relato para inteligência coletiva

Estado: `COMUN_48_6_B2_A0_REPORT_TO_COLLECTIVE_OPTIN_GREEN_MAP_OFF`

## Baseline e escopo

- Parent/main: `9516898014188015ababe4797d7f99277ab10b10`.
- Branch: `codex/48-6-b2-a0-report-to-collective-optin`.
- O B2-A0 conectou a confirmação pós-relato ao opt-in de projeção coletiva já entregue pelo B1.
- Não foram criados migration, endpoint, tabela, fila, case model, matcher, flag ou catálogo novo.

## Modelo reutilizado

O Relata continua sendo a única captura. Depois de uma persistência bem-sucedida, a rota existente `/api/comun/relata` devolve o `walletItemId` associado à Carteira de Participação. A confirmação pós-envio agora monta o mesmo `PublicProjectionConsentPanel` já usado em “Minha participação”.

O painel reutiliza exclusivamente `/api/comun/denuncias/public-projection-consent`: o servidor resolve a carteira, o item, a posse, a categoria, a localização e a elegibilidade. Um identificador enviado pelo browser não concede autoridade. Sem carteira, posse válida, localização pronta ou categoria allowlisted, o painel não é disponibilizado.

Allowlist preservada: `public_lighting`, `power_distribution` e `smoke_or_environmental_trace`. Saúde, educação, proteção infantil, emergências, relatos retirados e demais categorias continuam fora do opt-in.

## Contratos preservados

- Consentimento permanece opcional, começa desligado e não é pré-marcado.
- Consentimento de mapa não é inferido de encaminhamento, localização, evidência, participação, protocolo COMUN ou protocolo oficial.
- `consentimento != agrupamento != projeção pública != envio oficial`.
- `prepared != sent` e `automationAllowed=false` permanecem inalterados.
- O mapa Production continua OFF; confirmações públicas continuam sem uso.
- A3 permanece ON/encrypted/Production-only; A4 permanece ON/encrypted/Production-only.
- Nenhum texto, nome, endereço, foto, protocolo ou ID interno é exposto pelo novo encaixe.

## Mudanças

- `app/comun/relatar/quick-capture-v2.tsx`: exibe o painel B1 após o recibo persistido somente quando há `walletItemId`, categoria allowlisted e estado não retirado.
- `lib/comun-denuncias-public-opt-in.test.ts`: regressões para a conexão pós-relato e para a reutilização do endpoint server-owned, sem IDs internos de caso/relato/membership.

## Filas e infraestrutura evitadas

Não há `comun_cultural_curation_queue`, segunda fila de denúncias, novo fluxo de agrupamento, confirmação anônima, API de auto-envio, migration ou alteração do modelo coletivo. O caminho futuro “Também estou com esse problema” permanece deferido para um relato real, não para contador anônimo.

## Produção e dados reais

Este tijolo não criou relato, não recuperou carteira, não registrou consentimento e não ativou projeção. A carteira aberta no produto não contém registros neste navegador; por isso não houve candidato real elegível e nenhum gate humano de consentimento foi acionado.

Esperado e verificado por escopo:

```text
ProductionSchemaWrites=0
ProductionBusinessWrites=0
ProductionEnvWrites=0
projectionRows=0
confirmationRows=0
publicMapProduction=false
publicOfficialSends=0
```

## Verificação

- Teste focal do opt-in: GREEN.
- Gates completos: executar antes do checkpoint/push.
- Preview e COST-02: pendentes até o checkpoint final desta branch.

## Próximo limite

Não iniciar B2-A1. A ativação do mapa, confirmação pública, agrupamento real e qualquer escrita de Production permanecem fora deste tijolo.
