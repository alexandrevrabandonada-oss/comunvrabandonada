# Tijolo 45.2 — inventário de prontidão E2E das Calçadas

## Marcador

`COMUN_CALCADAS_E2E_INVENTORY_COMPLETE`

Base auditada: `8ab8ce3319d162577049437a0afb8b80aae5ed00`.

Escala: **green** = evidência de implementação e teste já existentes;
**yellow** = implementação ou cobertura parcial, a confirmar no ambiente
descartável; **red** = indisponível por contrato; **unknown** = ainda sem
execução local nesta missão.

| Etapa                          | Implementada | Testada | Ativa localmente | Pronta para remoto | Estado | Evidência                                                                      |
| ------------------------------ | ------------ | ------- | ---------------- | ------------------ | ------ | ------------------------------------------------------------------------------ |
| Envio autenticado              | sim          | sim     | sim              | não                | green  | conta sintética e submissão aprovadas em 390×844, 768×1024 e 1440×900          |
| Upload privado                 | sim          | sim     | sim              | não                | green  | E2E confirma upload e verifica objeto privado sem exposição pública            |
| Confirmação recuperável        | sim          | sim     | sim              | não                | green  | executor canônico local: primeira passagem OK e segunda `ALREADY_APPLIED`      |
| Criação do registro            | sim          | sim     | sim              | não                | green  | E2E consulta o registro criado em `comun_sidewalk_records`                     |
| Acompanhamento pelo membro     | sim          | sim     | sim              | não                | green  | Minha Participação mostra o registro em triagem                                |
| Moderação                      | sim          | sim     | sim              | não                | green  | fila administrativa aprova resumo sanitizado e geometria aproximada            |
| Pedido/resposta de complemento | sim          | sim     | sim              | não                | green  | inbox, observação privada e aprovação são percorridos no E2E                   |
| Publicação sanitizada          | sim          | sim     | sim              | não                | green  | E2E rejeita geometria, chaves e identificadores privados nas saídas públicas   |
| Imagem derivada pública        | sim          | sim     | sim              | não                | green  | teste percorre a publicação sem expor o original privado                       |
| Localização aproximada         | sim          | sim     | sim              | não                | green  | geometria pública é criada somente após moderação                              |
| Aparição no mapa real          | sim          | sim     | sim              | não                | green  | mapa real, lista e ficha pública passam nas três dimensões visuais             |
| Possível duplicidade           | sim          | sim     | sim              | não                | green  | fluxo administrativo de sinais de duplicidade é percorrido antes da prioridade |
| Transformação em prioridade    | sim          | sim     | sim              | não                | green  | roda de prioridade publicada no E2E                                            |
| Encaminhamento                 | sim          | sim     | sim              | não                | green  | estados `ready_for_review` e `protocol_pending` aprovados no E2E               |
| Protocolo                      | sim          | sim     | sim              | não                | green  | protocolo sintético local registrado sem envio externo                         |
| Resposta                       | sim          | sim     | sim              | não                | green  | estado `response_received` aprovado                                            |
| Resultado                      | sim          | sim     | sim              | não                | green  | resultado público sanitizado aprovado                                          |
| Memória                        | sim          | sim     | sim              | não                | green  | memória criada, revisada e publicada no detalhe público                        |
| Compatibilidade pré-migration  | sim          | sim     | não aplicável    | sim                | green  | `verify-sidewalk-premigration-compat.mjs`                                      |

## Fatos de segurança já confirmados no código

- o gate server-only permanece fail-closed enquanto flag, ledger ou checksum
  não correspondem ao contrato;
- o teste integral verifica que exportações públicas não contêm geometria
  privada, chave de objeto, identificador do membro, `service_role` nem o
  prefixo de originais;
- a migration operacional e o manifesto não serão modificados neste
  checkpoint;
- remoto permanece indisponível para a operação até a autorização futura.

## Evidência local descartável

- a compatibilidade pré-migration foi exercida com a flag desabilitada: mapa
  e contribuição pausada responderam sem acessar objetos novos;
- o checksum da migration local permaneceu
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`;
- o executor canônico local produziu PRE
  `a6599aa24658c4339c7518d484364699d07ca4fa9cb1db68bb6fed4c20b94a10`
  e POST `614908b735616fc64d4d36bc05e050ee53a0fb2b1f4e099febe1f327923350c4`,
  com segunda passagem `ALREADY_APPLIED`;
- há seis FKs obrigatórias do contrato e uma sétima relação posterior e
  independente de Ações Coletivas; cinco bloqueiam, seis ou mais permitem;
- a suíte integral passou em 390×844, 768×1024 e 1440×900, gerando 23
  capturas locais por dimensão; os artefatos não são versionados;
- nenhuma dessas evidências envolve banco, storage, migration ou flag remotos.
