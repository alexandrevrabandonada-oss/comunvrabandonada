# Diagnóstico das fixtures de performance

Causa de `renderedItems: 0`: o harness anterior criava somente personas Auth; nenhum item era inserido em `comun_editorial_operation_items`. A rota central consultava corretamente essa tabela, portanto exibiu estado vazio.

Correção: `operational-performance-scenario.mjs` cria pauta, papéis mínimos, itens, atribuições e eventos com `fixture_tag` por run id; confirma a contagem SQL e remove todos os registros no cleanup.

| Cenário | SQL | Resposta | DOM |
|---|---:|---:|---:|
| 0 | 0 | 0 | 0 |
| 25 | 25 | 25 | 25 |
| 50 | 50 | 50 | 50 |
| 100 | 100 | 100 | 100 |

O primeiro ensaio foi rejeitado pela constraint de `visibility`; corrigido para o valor já utilizado pelas fixtures locais. Um segundo ensaio excedeu o timeout antes da inserção por recriar 14 personas a cada cenário; a bateria final reutiliza os dois papéis mínimos e passou.
