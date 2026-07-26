# Tijolo 44.3 — ação coletiva até resultado e memória

Atualizado em 26 de julho de 2026.

## Decisão

`COMUN_TIJolo_44_3_ACTION_TO_MEMORY_MERGED`

A fundação de Ações Coletivas foi integrada sem ativar a operação no banco de
produção. A jornada administrativa está pronta no código e demonstrável por
fixtures sintéticas somente no Preview.

## Entrega integrada

- PR: [#40](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/40);
- SHA candidato:
  `2015c6cc4d265211f632cfcdd9b9a10301009d96`;
- merge commit:
  `28f26f2b7c101633e6b68332e0cea003bc4c3af1`;
- ciclo administrativo: criação e edição, tarefas, publicação, atualizações
  idempotentes, encaminhamento, protocolo, resposta, conclusão, resultado e
  memória;
- timeline: eventos públicos sanitizados, ordenados cronologicamente e sem
  duplicação por reenvio;
- memória: ação concluída permanece pública com resultado, aprendizados e
  próximos desdobramentos.

## Segurança e compatibilidade

- o gate `COMUN_COLLECTIVE_ACTIONS_V1` permanece fail-closed em produção;
- quando desabilitado, não há consulta ou escrita em tabelas novas;
- fixtures existem somente com `VERCEL_ENV=preview` e
  `COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES=enabled`, sempre em memória;
- textos administrativos passam por sanitização pública; dados de participação
  não são expostos;
- a migration local
  `20260726171220_collective_action_administration_memory.sql` foi versionada,
  mas não foi aplicada remotamente;
- não houve escrita em banco remoto, storage ou histórico de migrations.

## Gates e evidências

| Gate | Resultado | Evidência |
| --- | --- | --- |
| MICRO | aprovado | [run 30215943724](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30215943724) |
| CHECKPOINT | aprovado | [run 30216002336](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216002336) |
| RELEASE/FULL | aprovado | [run 30216249436](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216249436) |
| Preview | READY no SHA candidato | [abrir](https://comunvrabandonada-l3t60frnq-alexandrevrabandonada-oss-projects.vercel.app) |
| Produção | READY no merge SHA | [abrir](https://comunvrabandonada-p0xatd36v-alexandrevrabandonada-oss-projects.vercel.app) |

A auditoria responsiva do CHECKPOINT cobriu listagem, ação aberta, tarefas,
timeline, encaminhamento, protocolo, resposta, resultado, memória, Minha
Participação e Administração em 390×844, 768×1024 e 1440×900. As capturas
estão no [artefato do run](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/30216002336/artifacts/8635868797).

## Smoke de produção

- `/comun/acoes`: HTTP 200 e mensagem amigável de preparação;
- `/comun/minha-participacao`: HTTP 307 esperado para autenticação;
- `/comun/admin/acoes`: HTTP 307 esperado para autenticação;
- logs de runtime em nível de erro: nenhum encontrado;
- nenhuma rota inspecionada retornou erro de schema.

## Próximo gate

A ativação operacional continua uma decisão separada: aplicar a migration
somente sob autorização, validar o ledger e então habilitar a flag em produção.
