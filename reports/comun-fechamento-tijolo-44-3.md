# Fechamento do Tijolo 44.3 — Ação Coletiva até Memória

Atualizado em 26 de julho de 2026.

## Decisão

`COMUN_TIJolo_44_3_ACTION_TO_MEMORY_MERGED`

O ciclo administrativo de Ações Coletivas foi integrado ao código sem ativar
a operação no banco remoto.

## Entrega

- criação e edição de ação, território, tipo, datas e objetivo;
- tarefas pequenas com controle de vagas e transições idempotentes;
- publicação de atualização, encaminhamento, protocolo e resposta;
- transição para aguardando resultado, conclusão, resultado e memória;
- página pública persistente com timeline cronológica e conteúdo sanitizado;
- fixtures sintéticas apenas em Preview, em memória e sem escrita.

## Evidências do merge

- PR: [#40](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/40);
- SHA candidato:
  `2015c6cc4d265211f632cfcdd9b9a10301009d96`;
- merge commit:
  `28f26f2b7c101633e6b68332e0cea003bc4c3af1`;
- MICRO: [aprovado](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30215943724);
- CHECKPOINT: [aprovado](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216002336);
- RELEASE/FULL: [aprovado](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216249436);
- auditoria visual: [capturas responsivas](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216002336/artifacts/8635868797);
- Preview: [READY](https://comunvrabandonada-l3t60frnq-alexandrevrabandonada-oss-projects.vercel.app);
- Produção: [READY](https://comunvrabandonada-p0xatd36v-alexandrevrabandonada-oss-projects.vercel.app).

## Estado operacional

- `COMUN_COLLECTIVE_ACTIONS_V1` permanece desabilitada em produção;
- a migration local `20260726171220_collective_action_administration_memory.sql`
  não foi aplicada remotamente;
- `/comun/acoes` respondeu HTTP 200 com o estado público de preparação;
- áreas autenticadas responderam HTTP 307 controlado;
- não houve 5xx, erro de schema ou log de runtime em nível de erro no smoke;
- não houve escrita em banco remoto, storage ou histórico de migrations.

## Próximo passo

A ativação operacional é um gate separado: autorização para migration, ledger
validado e habilitação explícita da flag. Este fechamento não autoriza nenhum
desses passos.
