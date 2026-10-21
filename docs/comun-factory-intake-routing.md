# COMUN 49-D1.2 — entrada e triagem da Fábrica

Status: contrato candidato. Não cria rota pública nova, writer, tabela, Caso FC, upload ou encaminhamento automático.

## Decisão arquitetural

A Fábrica **não terá um segundo intake público de problemas da cidade**.

O COMUN já possui uma entrada canônica em `/comun/relatar`, com captura privada, classificação de privacidade, urgência, revisão humana e projeção pública controlada.

Portanto:

```text
problema cívico
→ Relata
→ triagem/caso cívico
→ Pauta/Ação/Tarefa quando fizer sentido
→ Fábrica apenas se surgir trabalho material/técnico
```

Isso impede que a mesma situação vire simultaneamente “relato” e “caso de fábrica” sem relação canônica.

## As três portas da Fábrica

A futura superfície `/comun/fabrica` continua cognitivamente simples.

### Tenho um problema

Não significa “criar Caso FC”.

A primeira função é descobrir **qual fluxo resolve melhor**.

### Quero fazer

Leva a trabalho e tarefas canônicas, inclusive às sugestões privadas do 49-C3 quando esse bloco estiver ativo.

### Quero aprender

Leva à Escola COMUN, preferencialmente contextualizada pela necessidade prática.

## Roteamento de “Tenho um problema”

### Problema cívico

Exemplos:

- poste apagado;
- escola muito quente;
- barreira de acessibilidade;
- poluição;
- equipamento público quebrado;
- problema de água/transporte/saúde.

Destino:

`/comun/relatar`

A Fábrica não replica categoria, urgência, privacidade, anexos, localização ou protocolo.

### Objeto/reparo

Exemplo:

> quebrou uma pequena peça de um objeto e quero saber se dá para recuperar.

Destino:

**triagem privada da Fábrica**.

No D1 essa triagem é operacional/manual. Ainda não existe writer fabril.

### Pedido de protótipo

Exemplo:

> precisamos de uma caixa para este sensor.

Destino:

triagem privada da Fábrica.

Só depois da triagem pode surgir Caso FC e, se houver trabalho técnico, uma Tarefa canônica.

### Projeto para aprender

Exemplo:

> quero aprender a modelar uma peça.

Destino:

Escola COMUN.

Isso pode depois voltar à Fábrica como prática real, mas não cria caso automaticamente.

### Componente crítico

Exemplos:

- peça de freio;
- componente de sustentação de pessoa;
- dispositivo médico crítico;
- item de proteção cuja falha possa causar lesão grave.

Destino:

**encaminhamento qualificado**, fora do fluxo comunitário comum.

Não criar Caso FC comum nem “tentar para ver”.

## Confirmação humana

IA ou regras podem futuramente **sugerir** uma intenção.

O contrato não aceita essa sugestão como decisão final.

Sem `confirmedByPerson=true`:

```text
→ triagem humana
→ zero persistência fabril automática
```

## Perigo público imediato

Se o problema envolve perigo público imediato, o roteador prioriza o Relata, onde urgência e canal adequado pertencem ao domínio cívico.

A Fábrica não se torna central de emergência.

## Persistência

O roteador retorna sempre:

`persistFactoryCase: false`

Criar um Caso FC é uma decisão posterior da triagem, não consequência de clicar numa porta.

Essa separação evita:

- spam virar projeto;
- denúncia virar ordem de fabricação;
- dado sensível entrar em tabela técnica;
- contagem de entradas ser confundida com demanda fabril real.

## Próximo passo de experiência

Quando houver dados e operação reais, a interface pode apresentar:

> Parece um problema da cidade. O COMUN já tem um caminho protegido para isso.

**Continuar no Relata**

ou:

> Parece uma peça/objeto que podemos avaliar.

**Pedir triagem da Fábrica**

Mas o D1.2 atual entrega somente o contrato de roteamento.

Regra: **primeiro encontrar o fluxo certo; depois decidir se fabricar faz sentido.**
