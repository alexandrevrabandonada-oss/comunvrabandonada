# Fábrica COMUN 49-D1.1 — playbook do piloto

Status: plano operacional candidato. Os casos abaixo são **desafios de ensaio**, não atendimentos já realizados, não métricas reais e não autorizam publicação de impacto.

## Objetivo do primeiro ciclo

Provar o mecanismo:

> problema real → triagem → tarefa canônica → trabalho técnico → teste → resultado → documentação

antes de criar schema fabril, comprar uma segunda máquina ou abrir atendimento irrestrito.

## Regra de abertura

Nos primeiros dez casos, aceitar variedade deliberada. O piloto precisa descobrir tanto onde a Fábrica funciona quanto onde **não deve fabricar**.

Cada caso deve registrar, no mínimo:

- código FC;
- problema em linguagem simples;
- origem e contexto;
- disposição de triagem;
- classe de risco;
- Pauta/Ação/Tarefa quando houver trabalho coletivo;
- material e custo real;
- versão técnica;
- teste;
- resultado;
- falha/revisão, se ocorrer;
- possibilidade de abertura/replicação.

Dados pessoais desnecessários ficam fora do registro técnico.

## Dez desafios candidatos

### FC-0001 — Organizador interno

**Objetivo:** dominar fluxo básico sem depender de demanda externa.

**Tipo:** interno · R0/R1.

**Aprendizagem:** medição, CAD simples, slicer, impressão e documentação.

**Sucesso:** peça usada pela equipe e versão registrada.

### FC-0002 — Reparo doméstico simples

**Objetivo:** reproduzir uma pequena peça plástica quebrada.

**Tipo:** Repara COMUN · R1.

**Teste principal:** encaixe e uso repetido.

**Pergunta:** fabricar realmente é melhor que comprar uma peça comum?

### FC-0003 — Suporte audiovisual

**Objetivo:** criar adaptação simples para celular, microfone, câmera ou cabo.

**Tipo:** infraestrutura da associação · R1.

**Aprendizagem:** tolerância, parafusos/inserts e teste funcional.

### FC-0004 — Caixa ESP32 de bancada

**Objetivo:** integrar fabricação e eletrônica sem exposição externa.

**Tipo:** tecnologia comunitária · R1.

**Aprendizagem:** dimensões reais, passagens de cabo, ventilação e manutenção.

### FC-0005 — SEMEAR Mini, primeira caixa externa

**Objetivo:** prototipar abrigo para sensor ambiental.

**Tipo:** ambiente · R2 candidato.

**Obrigatório:** teste de exposição antes de instalação.

**Observação:** os dados do sensor pertencem ao Observatório correspondente, não ao Caso FC.

### FC-0006 — Mapa tátil piloto

**Objetivo:** produzir um pequeno recorte territorial acessível.

**Tipo:** acessibilidade + território · R0.

**Obrigatório:** avaliação com usuários antes de declarar solução validada.

### FC-0007 — Maquete de problema urbano

**Objetivo:** transformar um recorte territorial ou intervenção em modelo físico para discussão coletiva.

**Tipo:** território · R0.

**Teste:** outra pessoa consegue compreender o problema e as alternativas usando o modelo?

### FC-0008 — Demanda de escola

**Objetivo:** testar entrada institucional real.

**Tipo:** escola · risco definido somente após triagem.

**Regra:** não fabricar silenciosamente uma solução que esconda responsabilidade pública sistêmica. Se o problema for recorrente, registrar também a dimensão institucional.

### FC-0009 — Adaptação de projeto aberto

**Objetivo:** testar reuso em vez de projetar do zero.

**Tipo:** open-source · R0/R1.

**Métrica:** tempo e custo economizados pelo reuso.

### FC-0010 — Caso de não fabricação

**Objetivo:** demonstrar julgamento técnico.

Selecionar uma demanda em que impressão 3D seja pior, insegura, desnecessária ou mais cara que reparar, comprar, encaminhar ou usar outra técnica.

**Resultado esperado:** `do_not_fabricate` ou `refer`, com justificativa registrada.

O sucesso do FC-0010 é **não produzir** quando essa for a melhor decisão.

## Ritual por caso

### 1. Entrada

Registrar o problema sem exigir vocabulário técnico.

### 2. Triagem

Perguntar:

1. dá para reparar sem fabricar?
2. existe peça pronta adequada?
3. existe projeto aberto reutilizável?
4. a fabricação 3D é tecnicamente adequada?
5. qual risco?
6. é problema individual ou coletivo?
7. existe responsabilidade institucional que não deve ser escondida?

### 3. Responsabilidade

Trabalho técnico real precisa virar Tarefa canônica.

Se houver aprendizagem, ligar a uma prática da Escola quando o contrato permitir.

### 4. Protótipo

Produzir a menor versão capaz de responder à pergunta técnica.

### 5. Teste

Definir antes do teste:

- o que significa funcionar;
- o que significa falhar;
- por quanto tempo;
- em qual condição.

### 6. Revisão

Falha volta para design/protótipo. Não apagar versão ruim do histórico.

### 7. Fechamento

Registrar:

- resolvido / não resolvido;
- custo;
- versão;
- destino;
- limitações;
- próximos testes;
- possibilidade de reuso.

## Gate D1 mínimo

O avaliador puro em `lib/comun-factory-pilot-evaluation.ts` considera o D1 mínimo aprovado somente quando houver:

- 10 casos iniciados;
- 5 casos resolvidos;
- ao menos um `do_not_fabricate`;
- ao menos um caso com revisão real;
- custo registrado para todos os casos iniciados;
- versão registrada para todos os casos iniciados.

Esses são dados a preencher com observação real. Fixtures de teste nunca contam como execução do piloto.

## FC-MVP-25

O checkpoint ampliado adiciona:

- 25 iniciados;
- 15 resolvidos;
- 5 projetos abertos;
- 3 operadores autônomos;
- 5 pessoas em formação;
- ao menos um caso de escola;
- ao menos um projeto de acessibilidade;
- ao menos uma tecnologia ambiental;
- ao menos uma solução reutilizada por outro caso ou contexto.

Quantidade de horas de máquina, gramas impressas ou peças produzidas não substitui nenhum desses critérios.

## Saída para 49-D2

Ao final, listar cada informação técnica que precisou ser registrada repetidamente.

Somente campos que demonstraram estabilidade e necessidade entram como candidatos a schema.

A pergunta é:

> qual dado fabril não cabe honestamente em Pauta, Ação, Tarefa, Escola, Resultado ou Memória e apareceu repetidamente no trabalho real?

Essa lista, e não uma modelagem antecipada, define o D2.
