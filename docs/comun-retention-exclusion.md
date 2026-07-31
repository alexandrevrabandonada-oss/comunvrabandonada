# Retenção, despublicação e exclusão

Os prazos abaixo são operacionais. Obrigações legais permanecem sujeitas a
revisão; este documento não inventa prazo legal.

| Dado                   | Estado inicial              | Retenção operacional                                     | Quarentena                               | Exclusão                                                          | Preservação                                     |
| ---------------------- | --------------------------- | -------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| Upload não confirmado  | privado, aguardando arquivo | até expirar a autorização                                | 24 h após expiração                      | elegível após 7 dias, releitura e ausência de vínculo             | evento agregado sem object key                  |
| Foto abandonada        | original privado            | enquanto revisão/recuperação estiver aberta              | mínimo 24 h                              | gate irreversível após elegibilidade explícita                    | checksum e resultado sanitizado                 |
| Original cultural      | privado                     | conforme consentimento e finalidade histórica            | ao receber retirada, embargo ou suspeita | somente após direitos, consentimento e preservação serem revistos | pode permanecer privado se consentido           |
| Derivada pública       | publicada                   | enquanto publicação aprovada                             | despublicação imediata                   | remover objeto/caches após releitura                              | crédito e memória sanitizada quando autorizados |
| Consentimento          | privado                     | enquanto necessário para comprovar permissão ou retirada | não se aplica como arquivo público       | anonimizar/excluir conforme revisão específica                    | trilha mínima da decisão sem documento          |
| Contribuição rejeitada | privada                     | período operacional de recurso/revisão                   | estado rejeitado                         | anonimização ou exclusão elegível                                 | motivo público somente se seguro                |
| Contato                | privado                     | somente enquanto retorno estiver pendente/consentido     | acesso restrito                          | prioridade de anonimização/exclusão                               | nenhuma cópia em artifact                       |
| Inbox e vínculo        | comunitário restrito        | enquanto conta/vínculo e ação existirem                  | papel revogado imediatamente             | anonimização por pedido elegível                                  | evento sanitizado                               |
| Logs e auditoria       | sanitizado                  | janela necessária para operação e incidente              | log inseguro é contido                   | expiração automatizada quando configurada                         | resultado agregado, não payload                 |
| Artifact               | sanitizado                  | 7 dias por padrão nos workflows deste domínio            | artifact inseguro é rejeitado            | expiração do provedor                                             | referência de run e resultado                   |
| Dado sintético         | privado e marcado           | duração do ensaio                                        | namespace isolado                        | no `finally`                                                      | somente contagem e resultado                    |
| Backup efêmero         | altamente sensível          | duração do job                                           | diretório 0700/arquivo 0600              | no `finally`, inclusive em falha                                  | envelope agregado                               |
| Sessão                 | altamente sensível          | validade técnica do Auth                                 | revogação em incidente                   | invalidação/reautenticação                                        | não exportar                                    |
| Pedido de retirada     | privado/P1                  | até conclusão e revisão                                  | conteúdo sai da superfície pública       | exclusão conforme escopo autorizado                               | trilha sanitizada da retirada                   |

## Contrato de automação

Podem rodar sem gate: dry-run, classificação, quarentena sintética, limpeza de
fixtures/temporários/backups efêmeros e expiração natural de signed URLs.

Dados reais não são apagados automaticamente neste tijolo. Exclusão real exige
regra explícita, elegibilidade, releitura imediatamente antes, contenção,
evidência sanitizada, operação idempotente e gate quando irreversível.

Despublicar, anonimizar, retirar uma derivada e apagar o original são operações
diferentes. O pedido precisa declarar qual delas é necessária.

Resultado do contrato: `COMUN_RETENTION_POLICY_GREEN`.
