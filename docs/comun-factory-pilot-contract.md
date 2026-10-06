# COMUN 49-D1 — contrato do piloto da Fábrica

Status: contrato candidato empilhado sobre 49-C1/C2/C3. Não cria migration, fila pública, estoque persistido ou autorização de máquina.

## Objetivo

Permitir que o piloto use identificadores `FC-XXXX` e registre estado técnico sem transformar o Caso FC em nova Pauta, Ação, Tarefa, Comunidade ou identidade.

O Caso FC é uma **projeção operacional técnica**.

## 1. Responsabilidade continua na tarefa

A partir de trabalho técnico real — design, protótipo, teste, fabricação ou instalação — o caso precisa apontar para uma tarefa canônica.

O Caso FC não possui:

- assignee próprio;
- lista de membros;
- papel comunitário;
- prazo duplicado da tarefa;
- status de participação.

Quem faz o quê continua no fluxo existente de Ação/Tarefa.

## 2. Triagem

Disposições iniciais:

- reparar;
- reutilizar;
- fabricar;
- pesquisar;
- encaminhar;
- não fabricar.

“Encaminhar” ou “não fabricar” não podem ser convertidos silenciosamente em fabricação.

## 3. Estados técnicos

```text
entrada
→ triagem
→ design
→ protótipo
→ teste
→ fabricação
→ instalação
→ fechamento
```

O fluxo permite voltas controladas para design/teste quando um protótipo ou instalação falha.

## 4. Risco

### R0

Expositivo/didático: maquetes, placas, organizadores.

### R1

Funcional de baixo risco: caixas e suportes simples.

### R2

Falha pode causar dano material ou exposição relevante. Instalação exige evidência de teste.

### R3

Falha pode causar lesão ou risco técnico significativo. Fabricação/instalação exige referência de aprovação qualificada; instalação também exige evidência de teste.

### R4

Crítico. Protótipo, teste, fabricação e instalação ficam bloqueados no fluxo comunitário comum. Um processo técnico próprio e responsabilidade adequada seriam pré-requisitos para qualquer evolução futura.

## 5. Integração com Escola e competências

O caso pode apontar para uma missão da Escola quando o trabalho também é prática formativa.

Isso não valida a prática automaticamente.

Fluxo possível:

```text
FC-0012
→ tarefa canônica: modelar caixa
→ missão Escola: CAD funcional
→ pessoa assume tarefa
→ produz protótipo
→ revisão da prática
→ evidência candidata de competência
```

## 6. Snapshot técnico

A projeção técnica sanitizada contém apenas:

- código;
- estado técnico;
- disposição;
- risco;
- versão;
- material;
- custo estimado.

Não expõe ids de pauta, ação, tarefa ou pessoa.

## 7. O que fica manual no D1

Durante o piloto:

- custo;
- material;
- versão;
- classe de risco;
- aprovação;
- evidência de teste.

podem ser registrados de forma controlada fora de schema fabril.

A finalidade do D1 é descobrir quais campos são realmente estáveis antes do D2.

## 8. Gate D1 → D2

Só considerar schema fabril depois de:

- 10 casos iniciados;
- 5 resolvidos;
- ao menos um caso em que fabricar foi recusado corretamente;
- ao menos uma falha/protótipo revisado;
- registro de custo e versão suficientemente consistente;
- nenhuma necessidade de duplicar pessoa, tarefa, ação, comunidade ou progresso educacional.

Checkpoint ampliado permanece FC-MVP-25.

Regra: **caso técnico acompanha o trabalho; não substitui o trabalho canônico.**
