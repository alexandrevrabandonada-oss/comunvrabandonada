# COMUN Relata — catálogo institucional de canais v1

Revisão documental: 3 de agosto de 2026. Versão:
`relata-channel-catalog-v1`.

O catálogo é somente informativo e auditável. Todos os 13 canais estão
`source_verified=true`, `operationally_checked=false` e
`automation_allowed=false`. Página oficial localizada não significa canal
testado, responsivo ou integrado. Nenhuma dessas referências é renderizada
como CTA público ou usada para envio no 48.0B.

## Inventário

| ID | Órgão/serviço | Tipo | Estado editorial |
| --- | --- | --- | --- |
| `vr-cau-156` | CAU / atendimento municipal | telefone | fonte verificada; operação pendente |
| `vr-cau-whatsapp-conflict` | CAU / atendimento municipal | WhatsApp | fontes oficiais conflitantes |
| `vr-fiscaliza-web` | Fiscaliza VR | web | fonte verificada; operação pendente |
| `vr-smma-danos-ambientais` | SMMA / danos e queimadas não emergenciais | web | fonte verificada; operação pendente |
| `light-call-center-conflict` | Light / distribuição | telefone | fontes oficiais conflitantes |
| `light-whatsapp` | Light / distribuição | WhatsApp | fonte verificada; operação pendente |
| `light-agencia-virtual` | Light / serviços | web | fonte verificada; operação pendente |
| `light-ouvidoria` | Light / recurso | ouvidoria | exige protocolo anterior |
| `aneel-escalation` | ANEEL / escalonamento | web | sequência distribuidora → ouvidoria → ANEEL |
| `cbmerj-193` | CBMERJ / fogo ou risco imediato | emergência | imediato, não enfileirável, sem automação |
| `inea-ouverj` | INEA/SEAS / ouvidoria ambiental | ouvidoria | fonte verificada; operação pendente |
| `ibama-falabr` | Ibama / denúncia ambiental | web | fonte verificada; operação pendente |
| `ibama-linha-verde` | Ibama / orientação e denúncia | telefone | fonte verificada; operação pendente |

## Conflitos preservados

- CAU WhatsApp: fontes oficiais apresentam `(24) 99300-2786` e
  `(24) 99288-5500`; nenhum número foi eleito como único.
- Light call center: fontes oficiais apresentam `0800 021 0196` e
  `0800 2820 120`; nenhum botão de ligação ou integração foi criado.
- Ouvidoria Light e ANEEL permanecem etapas separadas e preservam a exigência
  de protocolo anterior.

## Emergência

O 193 é classificado como assistência imediata, não assíncrona, não
enfileirável, sem promessa de protocolo e nunca acionada pelo servidor. A UI
prioriza orientação textual e declara que o COMUN não realizou o contato.

## Fontes

Foram normalizados 14 registros oficiais com título, URL, publicador, data da
fonte quando disponível, consulta em `2026-08-03` e SHA-256. O inventário
integral de URLs e hashes está em `comun-relata-channel-catalog.json` e o
contrato executável em `lib/comun-relata-channels.ts`.

Revisão operacional real continua pendente. Até lá,
`canUseRelataChannelAsIntegration()` retorna sempre `false`.
