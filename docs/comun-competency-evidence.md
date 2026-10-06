# COMUN 49-C1 — Competências com Evidência

Status: contrato candidato pós-V1. Não existe migration, perfil público de competências, matching ativo ou promoção automática nesta entrega.

## Objetivo

Criar uma camada compartilhada que permita ao COMUN responder, com cautela:

> o que esta pessoa demonstrou saber fazer, em qual escopo e com que evidência?

A resposta não vem de curso concluído, autoavaliação, popularidade, cargo ou quantidade de atividade.

Fluxo:

```text
conteúdo / orientação
  → prática
  → evidência de trabalho real
  → revisão independente
  → afirmação escopada de competência
  → uso privado em Minha Participação
  → publicação opcional e/ou matching opcional
```

## 1. O que não é competência

Não promover automaticamente:

- missão concluída;
- trilha concluída;
- tarefa assumida;
- papel numa comunidade;
- número de publicações;
- XP, pontos, sequência ou ranking;
- auto declaração;
- tempo de máquina;
- volume de peças fabricadas.

Esses sinais podem orientar uma revisão, mas não substituem evidência.

## 2. Fontes de evidência

Tipos iniciais do contrato:

- `learning_practice`: prática da Escola validada por outra pessoa;
- `collective_task_result`: entrega concreta numa tarefa/ação com resultado revisado;
- `reviewed_artifact`: artefato técnico/documental revisado;
- `field_installation`: instalação ou aplicação de campo com teste/verificação;
- `community_delivery`: entrega comunitária documentada.

A lista é de contrato, não autoriza criar integrações antes das raízes correspondentes existirem.

## 3. Afirmação escopada

Uma competência é uma afirmação como:

> “Modela peças funcionais simples a partir de medidas, com tolerâncias básicas.”

e não:

> “CAD nível 8”.

O registro precisa ter:

- identificador editorial da competência;
- rótulo humano;
- escopo demonstrado;
- pessoa titular;
- evidências que sustentam a afirmação;
- estado;
- pessoa/regras de revisão;
- data da demonstração;
- validade/revisão futura quando fizer sentido.

## 4. Estados

- `proposed`: existe uma proposta, ainda não demonstrada;
- `demonstrated`: há evidência validada e revisão independente;
- `review_due`: a afirmação precisa de nova demonstração antes de ser usada para matching;
- `retired`: não deve ser usada como capacidade vigente.

Não existe transição automática por quantidade de cursos.

## 5. Privacidade

Padrão: `private`.

`public_opt_in` só é aceito para `demonstrated`.

A projeção pública deve conter apenas:

- identificador público da competência;
- rótulo;
- escopo;
- data da demonstração, se apropriado.

Não publicar por padrão:

- IDs de reviewer;
- links de evidência privados;
- notas de revisão;
- pauta/tarefa privada;
- disponibilidade;
- produtividade;
- localização;
- ranking;
- motivo de rejeição.

A pessoa pode retirar a projeção pública sem apagar o histórico privado necessário à integridade.

## 6. Matching privado

Separado de visibilidade pública.

Uma pessoa pode manter a competência privada e ainda permitir, explicitamente, que o sistema a use para sugerir oportunidades.

Regras:

- apenas `demonstrated`;
- consentimento específico `allowMatching`;
- `review_due` e `retired` não entram;
- matching sugere; nunca atribui tarefa;
- não concede papel comunitário;
- não concede autorização administrativa;
- não substitui habilitação legal;
- não libera máquina perigosa automaticamente.

## 7. Revisão independente

Para uma afirmação `demonstrated`:

- deve existir ao menos uma evidência validada;
- a evidência pertence à mesma pessoa e competência;
- ao menos uma revisão validante precisa ser feita por outra pessoa;
- reviewer não pode ser a própria pessoa titular;
- evidência pendente/rejeitada não sustenta demonstração.

Futuras competências de maior risco podem exigir múltiplas evidências ou reviewer qualificado; isso pertence ao catálogo/regras editoriais, não a uma contagem genérica global.

## 8. Integração com Escola COMUN

Escola R0 já separa estudo e prática.

49-C1 reutiliza essa distinção:

```text
learning_progress completed
≠
competency demonstrated
```

Uma prática `validated` pode virar evidência candidata. A afirmação de competência continua sendo uma camada separada, porque:

- uma missão pode demonstrar apenas parte do escopo;
- várias missões podem contribuir para a mesma competência;
- trabalho real fora da Escola também pode ser evidência;
- revisão/validade podem ter regras próprias.

## 9. Integração com Minha Participação

Minha Participação é o centro pessoal.

Se 49-C1 for ativado, deve existir uma seção de capacidades/competências com:

- demonstradas;
- aguardando evidência/revisão;
- revisão necessária;
- controle de publicação;
- controle de matching;
- evidências acessíveis apenas conforme autorização.

Não criar perfil de reputação concorrente.

## 10. Integração com Comunidades e Núcleos

Competência não é cargo.

Uma comunidade pode procurar capacidades para formar grupo/tarefa, mas:

- membership continua em comunidades;
- papel continua no sistema de papéis;
- competência não cria membership;
- competência não promove alguém a coordenação;
- núcleo permanente continua no 49-A.

## 11. Integração com Fábrica COMUN

49-C1 é a camada compartilhada que impede a Fábrica de criar um “perfil maker” paralelo.

Exemplos futuros:

- medição e paquímetro;
- CAD funcional;
- impressão FDM supervisionada;
- diagnóstico de reparo;
- solda de baixa tensão;
- ESP32 básico;
- documentação técnica;
- mapa tátil/GIS aplicado.

Segurança de máquina é uma autorização separada.

## 12. Primeiro catálogo cívico candidato

O contrato inclui um catálogo R0 pequeno e editorial em `lib/comun-competency-catalog.ts`.

Ele não cria credenciais. Apenas mapeia práticas **validadas** da Escola R0 para evidências candidatas:

- Formulação de problema e objetivo;
- Investigação e uso responsável de evidências;
- Escuta e facilitação comunitária;
- Construção e revisão de ciclo estratégico.

Exemplo:

```text
prática "adicionar-evidencia" validada
→ candidata a sustentar "Investigação e uso responsável de evidências"
→ revisão da claim ainda é necessária
→ não há promoção automática
```

Missão concluída sem prática validada produz zero evidências candidatas.

## 13. Contrato de código desta entrega

`lib/comun-competency-evidence.ts` fixa invariantes puras:

- demonstração exige evidência validada e revisão não própria;
- publicação exige opt-in e estado demonstrado;
- projeção pública exclui evidências e reviewer;
- matching exige consentimento privado e competência vigente;
- competência de outra pessoa/escopo não pode ser anexada à claim.

Isso permite testar a arquitetura antes de existir schema.

## 14. Gate de schema

Só criar migration depois de:

1. Escola R0 ter destino canônico estabilizado;
2. ao menos um conjunto real de práticas revisadas existir;
3. catálogo inicial de competências ter revisão humana;
4. regras de revisão/validade por competência estarem definidas;
5. matriz RLS e retenção estar fechada;
6. experiência de Minha Participação estar desenhada;
7. nenhuma tabela duplicar progresso, tarefa, papel ou membership.

Regra: **evidência antes de credencial; competência antes de reputação; consentimento antes de exposição.**
