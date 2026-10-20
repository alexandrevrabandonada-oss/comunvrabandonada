# COMUN 49-C3 — sugestões privadas de tarefas por competência

Status: contrato candidato empilhado sobre 49-C1/C2. Não cria migration, requirement metadata persistido, atribuição automática ou superfície pública.

## Decisão

O COMUN já possui tarefas canônicas, participação na ação, atribuição voluntária, capacidade e liberação de tarefa. 49-C3 não cria uma segunda tabela de tarefas nem um segundo fluxo de aceite.

Ele acrescenta apenas:

> capacidade demonstrada + consentimento de matching + requisito humano da tarefa → sugestão privada

A pessoa continua precisando usar o fluxo canônico para **assumir tarefa**.

## 1. Escopo inicial

Sugestões só consideram tarefas:

- em ações para as quais a pessoa já é elegível;
- em estado aberto ou em andamento;
- com vaga disponível;
- não vencidas;
- com requisitos de competência explícitos;
- cujas competências obrigatórias estejam demonstradas e com matching permitido.

Tarefa sem requisito explícito continua visível pelos fluxos normais, mas não entra em matching por competência.

## 2. Requisito de competência da tarefa

O contrato usa uma camada derivada mínima:

- `taskId`;
- competências obrigatórias;
- competências opcionais.

Ela não copia título, descrição, prazo, capacidade, responsável ou estado da tarefa.

No futuro, essa camada pode ser persistida somente após revisão humana e RLS. IA pode sugerir um rascunho a partir da descrição, mas **nunca deve tornar esse rascunho requisito ativo automaticamente**.

## 3. Consentimento e privacidade

Matching depende de `allowMatching=true` na claim demonstrada.

Não depende de perfil público.

A sugestão não carrega:

- userId;
- reviewer;
- sourceId;
- evidência privada;
- nota de revisão;
- ranking da pessoa;
- disponibilidade presumida.

A organização vê a tarefa; a pessoa vê por que ela pode ser relevante. Isso não revela automaticamente à organização quem possui determinada competência.

## 4. Sem autoatribuição

O retorno do 49-C3 é uma lista de sugestões.

Não existe função:

```text
assignBestPerson(task)
```

A pessoa decide abrir a ação e assumir a tarefa pelo fluxo canônico existente, que preserva participação, capacidade e liberação.

## 5. Ordenação

A ordenação é de **oportunidades para a própria pessoa**, não de pessoas.

Prioridade candidata:

1. maior número de competências opcionais também demonstradas;
2. prazo mais próximo;
3. título para desempate estável.

Não existe “score de trabalhador”, leaderboard ou comparação pública entre pessoas.

## 6. Integração com a Fábrica COMUN

A Fábrica poderá usar o mesmo contrato.

Exemplo:

```text
tarefa canônica: modelar caixa do sensor
requisito: CAD funcional
opcional: documentação técnica
→ pessoa com CAD demonstrado + matching ligado recebe sugestão
→ abre a ação
→ escolhe assumir
→ assignment canônico existente
```

Nenhum projeto da Fábrica ganha mecanismo próprio de escalação de pessoas.

## 7. Gate para persistência

Antes de armazenar requisitos de competências em tarefas:

1. 49-C1/C2 precisam estar integrados;
2. Escola R0 precisa estar estável;
3. catálogo de competências precisa de revisão humana;
4. autoria e edição dos requisitos precisam de autorização definida;
5. RLS precisa impedir enumeração de competências de pessoas;
6. remover um requisito não pode alterar o histórico da tarefa;
7. matching deve continuar opt-in.

Regra: **sugerir não é atribuir; competência não é disponibilidade; matching não é perfil público.**
