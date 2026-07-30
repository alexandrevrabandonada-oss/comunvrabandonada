# Central operacional unificada

A Central responde “o que precisa de cuidado agora?” sem transformar a equipe
em ranking nem substituir decisões políticas. Ela é uma projeção sanitizada:
comunidades, pautas, ações, Calçadas e frentes culturais continuam sendo as
fontes canônicas.

## Contrato

- A projeção guarda domínio, tipo, referência interna, versão observada, fila,
  prioridade explicável, SLA, papel necessário, próxima ação e histórico.
- Conteúdo, contatos, originais, respostas integrais, consentimentos, object
  keys e coordenadas não são copiados.
- A chave idempotente combina domínio, tipo de fonte, fonte, categoria e ciclo.
- Uma nova versão atualiza ou reabre o mesmo item; nunca cria uma duplicata
  silenciosa.
- Sincronização lê as fontes e escreve somente nas tabelas privadas
  `comun_editorial_operation_*`.
- A Central permite assumir ou liberar uma atribuição própria quando o papel já
  está autorizado. Decisão editorial, publicação, rejeição, retirada,
  resultado verificado e envio externo continuam na fonte.

## Filas e prioridade

As filas representam trabalho: `entry`, `triage`, `rights`, `safety`,
`factual`, `editorial`, `publication`, `follow_up`, `corrections` e
`withdrawals`. Produtos diferentes compartilham a mesma fila quando exigem o
mesmo cuidado.

- P1: segurança, privacidade, retirada urgente ou risco concreto.
- P2: prazo institucional, atraso, acessibilidade pública ou processo
  bloqueado.
- P3: revisão e processamento comuns.
- P4: organização e enriquecimento sem prazo.

Popularidade e reações nunca elevam a prioridade.

## Rotina diária

### Início do turno

Abra “Agora · P1”, retiradas, vencidos, incidentes e itens sem responsável.
Contenha riscos; não publique nem decida pela fonte.

### Meio do turno

Percorra entrada, triagem, direitos, factual, editorial, processamento,
protocolos e respostas. Use “Abrir fonte especializada” para qualquer decisão
do domínio.

### Encerramento

Revise bloqueados, próximos prazos, atribuições abertas, incidentes e retornos
pendentes. O handoff usa apenas contagens, categorias e próximos passos
sanitizados.

## Automação

O workflow `COMUN Operations Deliverability` separa:

1. contrato e schema locais em PR;
2. preflight remoto somente leitura;
3. migration aditiva versionada;
4. sincronização limitada à projeção;
5. ensaio privado em transação revertida;
6. postflight read-only;
7. auditoria diária agregada.

Findings persistentes atualizam uma única issue agregadora. O workflow não
concede papéis, não toma decisões editoriais, não envia protocolos e não aciona
`launch_publicly`.
