# Fluxo político da pauta ao resultado

O COMUN trata participação como processo coletivo, não como uma sequência de
postagens. Uma contribuição pode alimentar uma pauta, uma conversa organizada,
uma síntese revisada, uma decisão, uma ação coletiva e, quando houver evidência,
um resultado e uma memória pública.

## Fontes canônicas

| Etapa política | Implementação existente           | Fonte canônica                        | Lacuna consolidada no Tijolo 47.4              | Ação                                                                |
| -------------- | --------------------------------- | ------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Contribuição   | contribuição moderada de pauta    | `comun_pauta_contributions`           | vínculo visível com o processo completo        | ciclo referencia a pauta sem copiar texto bruto                     |
| Moderação      | fila e estados editoriais         | `comun_pauta_contributions`           | transição explícita                            | máquina exige contribuição aprovada                                 |
| Roda/conversa  | rodas de construção               | `comun_construction_circles`          | proveniência na esteira                        | etapa exige roda aberta ou concluída                                |
| Síntese        | versões editoriais                | `comun_pauta_synthesis_versions`      | síntese como pré-condição da decisão           | vínculo explícito e histórico preservado                            |
| Decisão        | inexistia entidade própria        | `comun_pauta_decisions`               | autoria, justificativa e dupla revisão         | decisão versionada, publicada por pessoa diferente da autora        |
| Ação coletiva  | Tijolos 44–44.3                   | `comun_collective_actions`            | conexão com a decisão                          | ciclo guarda o vínculo sem duplicar a ação                          |
| Tarefa         | tarefas e atribuições das ações   | `comun_collective_action_tasks`       | etapa política derivada                        | tarefa válida não resolve a pauta                                   |
| Encaminhamento | encaminhamento da ação            | `comun_collective_action_forwardings` | vínculo sequencial                             | destino, objetivo, prazo e estado continuam na entidade canônica    |
| Protocolo      | Protocolo Popular e oficial       | `comun_official_protocols`            | vínculo verificável com pauta e ação           | protocolo só entra após evidência revisada; nenhum envio automático |
| Resposta       | resposta privada e resumo público | `comun_official_protocols`            | distinção entre bruto e publicável             | esteira exige resposta e resumo público sanitizado                  |
| Resultado      | resultados do Hub                 | `comun_hub_results`                   | atividade não podia ser distinguida de impacto | etapa exige resultado público verificado                            |
| Memória        | memória das Ações Coletivas       | `comun_collective_actions`            | linha política completa                        | publicação exige resumo revisado e histórico imutável               |

## Máquina de estados

O caminho normal é:

`contribuição → moderação → conversa → síntese → decisão → ação → tarefas → encaminhamento → protocolo → resposta → resultado → memória`

Uma memória pode ser reaberta e voltar para moderação ou conversa. Não há
atalho. Cada transição:

- exige o papel adequado;
- valida a entidade canônica da etapa;
- usa versão otimista para evitar corrida;
- aceita uma chave idempotente;
- grava um evento imutável;
- separa resumo público de nota privada;
- informa próxima ação e papel responsável.

São bloqueados, entre outros:

- contribuição pendente indo a resultado;
- ação em rascunho recebendo tarefas como etapa concluída;
- protocolo sem envio recebendo resposta;
- atividade concluída resolvendo automaticamente a pauta;
- resposta virando resultado positivo automaticamente;
- autora publicando a própria decisão;
- memória sem resultado verificado e versão pública revisada.

## Superfícies

O cockpit em `/comun/admin/pautas/[id]` reúne estado, lacunas, próxima ação,
contribuições, síntese, decisão e vínculos para ação, encaminhamento, protocolo,
resposta, resultado e memória. Editores especializados continuam disponíveis,
mas deixam de ser a única forma de acompanhar o processo.

A página pública da pauta apresenta somente o ciclo marcado como público, a
decisão publicada e eventos sanitizados. Ações Coletivas continuam nas rotas
`/comun/acoes`, `/comun/minha-participacao` e `/comun/admin/acoes`.

## Privacidade

A linha pública nunca seleciona texto bruto, contato, nota interna, identidade
do ator, resposta completa, chave de objeto, URL assinada, original fotográfico
ou coordenada privada. Ela usa:

- contribuições já moderadas;
- síntese e decisão publicadas;
- evidências `approved + public_safe`;
- resumo público de protocolo;
- resultado verificado;
- eventos sem nota privada.

Ensaios controlados usam `cycle_scope=controlled_rehearsal`, ficam invisíveis
por RLS e são revertidos integralmente na mesma transação.

## Promoção

O workflow separa quatro responsabilidades:

1. `preflight`: consulta read-only e classifica schema ausente, exato ou
   incompatível;
2. `migrate`: aceita somente o plano das quatro migrations aditivas esperadas;
3. `rehearse`: executa o ciclo autenticado sintético, privado e transacional;
4. `activate`: exige ensaio verde do mesmo SHA e ativa apenas
   `COMUN_COLLECTIVE_ACTIONS_V1`.

Nenhum desses modos aciona o gate terminal `launch_publicly`.
