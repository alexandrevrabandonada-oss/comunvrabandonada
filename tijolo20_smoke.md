# Tijolo 20 - Smoke

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.
- URL local usada: `http://localhost:3000`.

## Smoke existente

`npm run smoke:pauta-dossier-review-queue` passou:

- criou pauta teste;
- criou dossies em estados diferentes;
- confirmou classificacao de fila;
- confirmou mudanca de categoria apos revisao;
- confirmou que rota admin sem sessao nao expoe segredo;
- limpou dados de teste.

## Smoke novo

`npm run smoke:pauta-dossier-review-ops` foi criado para cobrir:

- criar dossie teste;
- atribuir responsavel factual;
- atribuir responsavel editorial;
- definir prazo;
- definir prioridade alta;
- confirmar aparicao nos filtros de responsavel/prioridade/vencido;
- confirmar que campos operacionais nao aparecem na rota publica;
- limpar dados de teste.

## Resultado final

Fechamento R1 aprovado:

- migration aplicada;
- smoke novo passou contra `http://localhost:3000`;
- campos operacionais nao apareceram na rota publica;
- dados de teste foram limpos.
