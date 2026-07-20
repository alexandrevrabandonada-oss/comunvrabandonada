# Operação editorial do COMUN

A Central Operacional em `/comun/admin/operacao` reúne dez filas privadas sem substituir os fluxos de origem. Cada item informa fila, estado, prioridade, prazo indicativo, próxima ação e gate humano. O detalhe consulta atribuições e eventos em paralelo e limita o histórico a 50 eventos. As tabelas têm RLS, nenhum grant para `anon` ou `authenticated`, e acesso server-only.

O ensaio padrão cria 100 itens sintéticos distribuídos nas dez filas, percorre 26 verificações de papéis, transições, mensagens, incidentes e sanitização, e remove tudo ao final. Saídas esperadas: `COMUN_EDITORIAL_OPERATION_LOCAL_OK` e `COMUN_TEST_FIXTURES_CLEAN`.

## Checagem de regressão do scheduler

O Gate 0 permanece encerrado conforme a evidência registrada na Sprint 22.1: execução agendada concluída, heartbeat saudável, fila vazia e nenhum alerta crítico. Nesta sprint não houve reconfiguração de cron, alteração de secrets, endpoint ou fila.
