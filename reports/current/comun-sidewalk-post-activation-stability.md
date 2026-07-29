# Tijolo 45.4 — estabilidade pós-ativação das Calçadas

Resultado: `COMUN_SIDEWALK_POST_ACTIVATION_STABILITY_BLOCKED`

## Escopo

O checkpoint `sidewalk-post-activation-checkpoint-20260729-04` auditou a
ativação `sidewalk-activate-20260729-03` exclusivamente por leitura. Não
executou ativação, migration, rollback, contribuição, upload, alteração de
ambiente ou deployment.

## Estado observado

- activation run: `30454192828`, attempt do GitHub Actions `1`
- activation SHA e `main` atual:
  `9b07bcfb52c4a3b9d00c5e0fa263237f3e8b110c`
- deployment Production mais recente: READY e associado ao SHA da ativação
- nenhum deployment posterior ou promoção em andamento
- inventário read-only: run `30455092900`, success
- diagnóstico protegido: run `30455096013`, success
- URL operacional do banco: presente em Production
- banco: reachable
- ledger: exact
- migration necessária: false
- flag: enabled
- runtime: `OPERATIONAL_READY`
- estado público: active

## Smoke público

Somente requisições GET foram usadas.

- `/comun/calcadas`: HTTP 200, interface renderizada
- `/comun/mapa/contribuir`: HTTP 200, formulário renderizado
- mensagem de pausa: ausente
- console errors: 0
- métodos POST/PUT/PATCH/DELETE observados: 0
- contribuição submetida: false
- stack trace ou padrão de segredo no HTML: não encontrado

O formulário foi apenas aberto. Nenhum campo foi preenchido, nenhum botão de
envio foi acionado e nenhum usuário ou sessão de teste foi criado.

## Logs

A consulta read-only de logs de Production cobriu o período iniciado no
término da ativação (`2026-07-29T13:06:28Z`). O conteúdo bruto permaneceu
localmente em diretório ignorado e não foi incorporado ao relatório.

- erros runtime: 0
- HTTP 500: 0
- timeout: 0
- migration: 0
- upload: 0
- erros de flag: 0
- reuso do attempt 03: 0

`logsEvidence=sufficient`.

## Attempt 03

- aparece na COMUN CENTRAL como consumido;
- possui exatamente um run de ativação;
- `run_attempt=1`;
- não houve retry;
- não existe outro run posterior de ativação;
- não existe workflow de Calçadas em andamento;
- artifacts, Central, SHA e run são coerentes;
- proteção:
  `attemptConsumptionControl=process_controlled_consistent`.

Permanece a limitação conhecida: não há nonce remoto persistente. O controle
continua processual, por autorização vinculada ao SHA/ledger/attempt,
concurrency e registro na COMUN CENTRAL. A limitação não foi alterada nem
reclassificada como resolvida.

## Finding bloqueante de evidência

O payload primário do diagnóstico protegido está correto:

- flag: enabled
- database: reachable
- ledger: exact
- operational state: `OPERATIONAL_READY`

Entretanto, o renderer legado executado pelo mesmo job ainda produz um pacote
referente ao attempt 02, com flag disabled, estado paused e classificação
`INSUFFICIENT_EVIDENCE`.

Essa contradição não indica regressão do produto, mas torna o conjunto de
evidências operacionalmente inconsistente. Pelos critérios deste tijolo, o
resultado não pode ser verde. Nenhuma correção de código foi feita durante o
diagnóstico.

## Zero escrita

- contribution: none
- database writes: none
- Storage writes: none
- ledger changes: none
- environment changes: none
- deployment changes: none
- activation executed by checkpoint: false
- migration executed: false
- rollback executed: false

## Integridade

- migration SHA-256:
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`
- manifesto SHA-256:
  `ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335`

## Próximo gate permitido

Criar um tijolo corretivo separado para tornar o renderer do diagnóstico
compatível com o estado pós-ativação e, depois, repetir este checkpoint
read-only. A validação da primeira contribuição em produção não está liberada
enquanto a evidência permanecer contraditória.
