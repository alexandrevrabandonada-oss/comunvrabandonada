# Tijolo 20-R1 - Smoke

## Ambiente

- Servidor local: `http://localhost:3000`.
- Deploy executado: nao.
- Smoke contra producao: nao.

## Review queue

`npm run smoke:pauta-dossier-review-queue` passou:

- criou pauta teste;
- criou dossies em estados diferentes;
- confirmou classificacao de fila;
- confirmou mudanca de categoria apos revisao;
- confirmou que rota admin sem sessao nao expoe segredo;
- limpou dados de teste.

## Review ops

`npm run smoke:pauta-dossier-review-ops` passou:

- criou pauta teste;
- criou dossie teste com responsavel factual;
- criou dossie teste com responsavel editorial;
- definiu prazo vencido;
- definiu prioridade alta;
- confirmou persistencia dos campos operacionais;
- confirmou UI da fila com filtros/indicadores operacionais;
- confirmou filtro por responsavel, prioridade e vencido no dado;
- confirmou que rota admin sem sessao nao expoe nota operacional;
- confirmou que responsaveis, prioridade, prazo e nota interna nao aparecem na rota publica;
- limpou dados de teste.

## Resultado

Smoke operacional aprovado.
