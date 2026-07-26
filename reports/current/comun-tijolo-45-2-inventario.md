# Tijolo 45.2 — inventário de prontidão E2E das Calçadas

## Marcador

`COMUN_CALCADAS_E2E_INVENTORY_COMPLETE`

Base auditada: `8ab8ce3319d162577049437a0afb8b80aae5ed00`.

Escala: **green** = evidência de implementação e teste já existentes;
**yellow** = implementação ou cobertura parcial, a confirmar no ambiente
descartável; **red** = indisponível por contrato; **unknown** = ainda sem
execução local nesta missão.

| Etapa | Implementada | Testada | Ativa localmente | Pronta para remoto | Estado | Evidência |
|---|---|---|---|---|---|---|
| Envio autenticado | sim | sim | unknown | não | yellow | `visitor-flow.spec.ts`: criação de conta e envio |
| Upload privado | sim | sim | unknown | não | yellow | fluxo Playwright e `comun_sidewalk_uploads` |
| Confirmação recuperável | sim | parcial | unknown | não | yellow | migration/release e testes unitários do executor |
| Criação do registro | sim | sim | unknown | não | yellow | E2E consulta `comun_sidewalk_records` |
| Acompanhamento pelo membro | sim | sim | unknown | não | yellow | Minha Área no E2E integral |
| Moderação | sim | sim | unknown | não | yellow | fila administrativa e aprovação com resumo sanitizado |
| Pedido/resposta de complemento | sim | parcial | unknown | não | yellow | observação privada e inbox; cenário formal pendente de consolidação |
| Publicação sanitizada | sim | sim | unknown | não | yellow | assertivas de geometria pública e ausência de campos privados |
| Imagem derivada pública | sim | parcial | unknown | não | yellow | modelo/foto moderada existente; fluxo deve ser reafirmado E2E |
| Localização aproximada | sim | sim | unknown | não | yellow | aprovação administrativa e geometria pública |
| Aparição no mapa real | sim | sim | unknown | não | yellow | lista, detalhe e mapa real no E2E |
| Possível duplicidade | sim | parcial | unknown | não | yellow | `comun_sidewalk_duplicate_suggestions`; caso de falha a consolidar |
| Transformação em prioridade | sim | sim | unknown | não | yellow | prioridade publicada no E2E |
| Encaminhamento | sim | sim | unknown | não | yellow | estados `ready_for_review` e `protocol_pending` |
| Protocolo | sim | sim | unknown | não | yellow | operador de protocolo no E2E |
| Resposta | sim | sim | unknown | não | yellow | estado `response_received` |
| Resultado | sim | sim | unknown | não | yellow | editor de resultado no E2E |
| Memória | sim | sim | unknown | não | yellow | criação, revisão e publicação da memória |
| Compatibilidade pré-migration | sim | sim | não aplicável | sim | green | `verify-sidewalk-premigration-compat.mjs` |

## Fatos de segurança já confirmados no código

- o gate server-only permanece fail-closed enquanto flag, ledger ou checksum
  não correspondem ao contrato;
- o teste integral verifica que exportações públicas não contêm geometria
  privada, chave de objeto, identificador do membro, `service_role` nem o
  prefixo de originais;
- a migration operacional e o manifesto não serão modificados neste
  checkpoint;
- remoto permanece indisponível para a operação até a autorização futura.

## Próxima evidência exigida

Subir a stack local descartável, aplicar a migration somente nela e executar a
suíte integral com personas e dados sintéticos. Nenhum item `yellow` deve ser
promovido a `green` antes dessa execução.
