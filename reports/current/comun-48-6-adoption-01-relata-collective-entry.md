# COMUN 48.6-ADOPTION-01 — do relato isolado ao primeiro vínculo coletivo

Data desta execução: 28/08/2026

## Escopo e baseline

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`.
- Main de entrada: `a65db0964e1ff41d2fb61d2535ce26fc0525a057`.
- Branch isolada: `codex/48-6-adoption-01-relata-collective-entry`.
- Mudança limitada à experiência de adoção do Relata; não houve migration,
  flag, segredo, deployment CLI, envio oficial, mapa ou projeção.
- O consentimento continua sendo opcional, explícito, revogável e executado
  pelo endpoint server-side existente a partir do `walletItemId`.

## Diagnóstico factual da fricção

O fluxo existente preserva a captura curta: texto → classificação canônica e
perguntas adaptativas somente quando necessárias → localização opcional →
`Guardar`. O protocolo COMUN só aparece depois do salvamento; o consentimento
territorial aparece depois do recibo e não é pré-requisito para guardar.

No pós-relato, a ordem observada no componente é: status de guardado, protocolo
COMUN, classificação/roteamento, consentimento territorial opcional,
encaminhamentos e acesso à Carteira. O código de recuperação continua em bloco
próprio, com opção de copiar ou salvar, sem ser enviado ao compartilhamento.

`Minha participação` reutiliza o mesmo painel por item da Carteira. Não foi
criada uma central de consentimentos nem um fluxo paralelo.

## Entrega de adoção

- `/comun/denuncias` preserva a porta “Você não precisa saber qual órgão
  procurar” e explica o benefício potencial de reconhecer relatos compatíveis,
  sem afirmar que já existem outras pessoas.
- Para as categorias já allowlisted (`public_lighting`,
  `power_distribution`, `smoke_or_environmental_trace`), a localização
  continua opcional e, quando a classificação já está disponível, explica que
  uma área aproximada ajuda a comparar relatos sem expor o endereço exato.
- Categorias de emergência, saúde, educação, infância e demais categorias fora
  da allowlist não recebem esse incentivo.
- O consentimento passou a apresentar primeiro o valor coletivo privado:
  comparação com relatos compatíveis. A tela também declara que hoje não há
  mapa público deste relato e que eventual uso territorial futuro depende das
  regras de segurança existentes.
- `waiting` comunica que o relato continua privado e será verificado; `matched`
  comunica apenas uma relação compatível, sem contagem privada, IDs,
  localização, texto, identidade, causalidade ou acusação.
- O compartilhamento é sempre manual e usa somente a URL pública genérica
  `https://comunsocial.online/comun/denuncias`. Não carrega protocolo,
  `walletItemId`, código de recuperação, categoria privada, localização ou
  qualquer dado do relato.

## Contratos preservados

```text
preReportRequiredFields = [texto suficiente para classificação]
postReportOptionalSteps = [localização, consentimento territorial, compartilhar COMUN]
eligibleCollectivePrompt = allowlist canônica + classificação não emergencial
locationStillOptional = true
consentStillOptional = true
sharePayloadPublicOnly = true
shareContainsReportData = false
publicMap = false
automaticProjection = false
automaticPauta = false
automaticAction = false
automaticOfficialSend = false
```

Não foi criado relato de validação em Production, não foi clicado consentimento
real em nome de usuário e não houve alteração de schema, ambiente ou negócio.

## Resultado

Estado de implementação: `COMUN_48_6_ADOPTION_01_RELATA_COLLECTIVE_ENTRY_GREEN_MAP_OFF`

- `singleSentenceCapture=true`
- `accountRequired=false`
- `locationRequired=false`
- `consentRequired=false`
- `collectiveValueVisible=true`
- `eligibleLocationPurposeVisible=true`
- `waitingStateHuman=true`
- `matchedStateHuman=true`
- `safeGenericShare=true`
- `publicMap=false`
- `ProductionSchemaWrites=0`
- `ProductionEnvWrites=0`
- `ProductionBusinessWrites=0`
- `COST01=preserved`, `COST02=preserved`, `COST03=preserved`, `COST04=preserved`

O próximo passo é uso real do fluxo. Não iniciar B2-A4 automaticamente; só
reavaliar depois que existir evidência sanitizada de coletivo real compatível.
