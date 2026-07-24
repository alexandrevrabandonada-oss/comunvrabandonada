# Projeto de cleanup remoto das calçadas — PR #23

> Documento histórico. Estado superado pelo fechamento verde da PR #23 em
> 23 de julho de 2026. Consulte
> `reports/current/estado-atual-comun.md`.

## Estado canônico atual

O cleanup está implementado e testado apenas para operação local/dry-run. Nenhum agendamento ou execução remota existe.

## Evidência atual

Dry-run local sem mutação e testes de ambiente incorreto, idade mínima, referência ativa e idempotência de objeto ausente.

## Gates fechados

- dry-run padrão;
- limite de lote;
- allowlist explícita fora de localhost;
- auditoria sanitizada e rechecagem contra corrida.

## Gates pendentes

- backup completo restaurado;
- regressão integral production-like;
- duas revisões nominais;
- aplicação remota autorizada.

## Decisão

**NO_GO_REMOTE_INTEGRATION**

Status: implementação local/testável concluída; não agendada remotamente.

O comando existente agora é dry-run por padrão, limita lotes a 100, exige `--execute` para mutar e exige `--allow-non-local`, `--project-ref` e allowlist de ambiente para qualquer host remoto. A rotina revalida referência ativa imediatamente antes da remoção, trata objeto ausente de forma idempotente e registra apenas contagens/códigos sanitizados. Testes unitários cobrem ambiente incorreto, referência ativa e idade mínima. O dry-run local passou com zero candidatos.

## Escopo

- tickets `draft`, `awaiting_upload`, `uploaded` e `upload_failed` expirados;
- objetos privados órfãos sem ticket/asset/registro confirmado;
- rascunhos abandonados sem atividade após retenção mínima;
- nunca remover original associado a registro, asset, revisão ou evidência ativa.

## Contrato de segurança

1. **dry-run obrigatório** e padrão;
2. exigir project ref explícito e denylist de refs locais/produção errada;
3. exigir token operacional server-side; nunca variável `NEXT_PUBLIC_*`;
4. selecionar lote pequeno com lock/skip locked;
5. idade mínima configurável, proposta inicial de 24 h para ticket e 7 dias para rascunho;
6. confirmar novamente inexistência de referências imediatamente antes da remoção;
7. remover objeto somente depois de registrar intenção sanitizada;
8. marcar ticket como `abandoned` após remoção ou ausência confirmada;
9. execução idempotente; “objeto não encontrado” é estado reconciliável;
10. interromper ao atingir limite de erros, divergência de ambiente ou aumento anormal de candidatos.

## Lotes e limites propostos

- dry-run: até 500 candidatos, sem mutação;
- execução: 25 itens por lote;
- máximo por execução: 100;
- concorrência: uma execução por project ref;
- timeout: 5 minutos;
- nenhuma varredura por prefixo sem cruzamento com banco.

## Auditoria sanitizada

Registrar apenas:

- run ID;
- project ref abreviado/hash;
- horário;
- regra e faixa de idade;
- quantidade examinada/elegível/removida/ignorada/falha;
- códigos de resultado;
- duração e cursor.

Não registrar object key completa, filename, payload, contato, coordenada, token ou conteúdo da imagem.

## Métricas e alarmes

- backlog de tickets expirados;
- idade do ticket mais antigo;
- órfãos detectados/removidos;
- taxa de falha de Storage;
- divergências ticket↔objeto;
- cleanup sem heartbeat.

Alarmar quando:

- backlog > 500;
- item mais antigo > 48 h;
- falhas > 5% ou três consecutivas;
- candidato possui referência ativa;
- project ref não corresponde ao allowlist;
- remoções superam o limite do lote.

## Fluxo proposto

`dry-run → revisão humana do resumo → autorização por janela → lote limitado → reconciliação → métrica → alarme → relatório`.

## Dependências fechadas

- `comun_sidewalk_uploads` ainda não existe remotamente;
- política de retenção não foi aprovada;
- rotina atual é deliberadamente local-only;
- scheduler/credencial remotos não foram definidos;
- schema reconciliation e Auth anônimo ainda estão em NO-GO.

Nenhum cleanup remoto deve ser implantado antes desses gates.
