# Fábrica COMUN — integração canônica

Status: contrato arquitetural pós-V1. Este documento não declara rota publicada, feature flag habilitada, migration aplicada, equipamento adquirido ou operação humana pronta.

## 1. Decisão central

A Fábrica COMUN é uma capacidade do COMUN para transformar problemas reais em prática, protótipos, soluções abertas e capacidade comunitária. Ela não é um segundo produto social, uma segunda Escola, um segundo perfil, uma nova hierarquia de comunidades nem um gerenciador paralelo de tarefas.

Fluxo conceitual:

```text
problema observado
  → pauta / contexto coletivo quando necessário
  → ação e tarefa concretas
  → prática da Escola quando houver aprendizagem
  → trabalho técnico da Fábrica
  → protótipo e teste
  → resultado verificável
  → memória e projeto reutilizável
  → nova aplicação / replicação
```

A Fábrica acrescenta metadados técnicos quando eles forem realmente necessários; identidade, organização social, educação, ação coletiva e memória continuam pertencendo às raízes canônicas existentes.

## 2. Mapa de reuso

| Necessidade da Fábrica | Estrutura canônica | Decisão |
| --- | --- | --- |
| Pessoa e sessão | Auth comunitária existente | REUSE_CANONICAL |
| Centro pessoal | Minha Participação | REUSE_CANONICAL |
| Comunidade temática/territorial | `comun_communities` | REUSE_CANONICAL |
| Pertencimento e papel | memberships e role assignments | REUSE_CANONICAL |
| Equipe temporária | `comun_community_work_groups` + tarefas | REUSE_CANONICAL |
| Problema coletivo | Pauta | REUSE_CANONICAL |
| Conversa estruturada | Roda | REUSE_CANONICAL |
| Execução | Ação coletiva e Tarefa | REUSE_CANONICAL |
| Formação | Escola COMUN / `comun_learning_*` | REUSE_CANONICAL |
| Evidência de prática | revisão da Escola + trabalho canônico | REUSE_WITH_EXTENSION |
| Competência | camada compartilhada futura, baseada em evidência | DERIVED_LAYER |
| Resultado e devolutiva | Resultado/Memória canônicos | REUSE_CANONICAL |
| Dados ambientais/urbanos | Observatórios próprios | REUSE_CANONICAL |
| Estado técnico de fabricação | futuro domínio fabril mínimo | REUSE_WITH_EXTENSION |
| Arquivos/versionamento técnico | futuro domínio fabril mínimo + contratos de publicação | REUSE_WITH_EXTENSION |
| Máquinas, materiais e manutenção | domínio operacional futuro | DOMAIN_SPECIFIC |
| Rede de parceiros/capacidades | camada distribuída futura | DOMAIN_SPECIFIC |

## 3. Portas da experiência

Quando 49-D for ativado, a entrada pode ser `/comun/fabrica`, mantendo o shell e a linguagem do COMUN. A superfície deve reduzir a escolha inicial a três intenções:

### Tenho um problema

A pessoa descreve o que não está funcionando, preferencialmente com foto e contexto mínimo. Ela não precisa escolher material, máquina, tecnologia ou tipo de arquivo.

A triagem decide se o caso:

- já possui solução reutilizável;
- cabe em reparo simples;
- deve virar trabalho técnico;
- exige investigação;
- pertence a uma pauta coletiva;
- deve ser encaminhado;
- não deve ser fabricado por inadequação ou risco.

Um envio não cria automaticamente Pauta, Ação ou Projeto.

### Quero fazer

Mostra trabalho real que pode ser assumido segundo contexto, autorização e capacidades demonstradas. A unidade de responsabilidade permanece a tarefa canônica. “Missão de fabricação” é apresentação e contexto; não é uma segunda tabela de tarefas.

### Quero aprender

Leva à Escola COMUN. A pessoa pode entrar por necessidade concreta (“preciso modelar esta peça”) e receber a menor sequência de micro-missões necessária para avançar.

A Fábrica não possui progresso educacional independente.

## 4. Escola COMUN dentro da Fábrica

A Escola é a única raiz educacional.

Um programa futuro `fabrica-comun-r0` pode reutilizar `comun_learning_programs`, unidades, recursos, matrículas, progresso e práticas já previstos na Escola.

Trilhas candidatas, a validar por uso real:

1. **Fabricação digital** — medição, CAD, fatiamento, impressão e acabamento.
2. **Reparo** — diagnóstico, engenharia reversa, desmontagem e reparabilidade.
3. **Eletrônica** — bancada, solda, ESP32, sensores e alimentação de baixa tensão.
4. **Território 3D** — mapas, GIS, maquetes e acessibilidade tátil.
5. **Tecnologia comunitária** — integrar hardware, software, campo, documentação e manutenção.

Princípios:

- micro-missões curtas;
- aplicação imediata;
- estudar e validar prática continuam separados;
- prática real pode ser revisada por outra pessoa;
- sem ranking público;
- sem punição por sequência;
- conteúdo versionado;
- segurança pode bloquear prática mesmo que o conteúdo teórico esteja concluído.

Enquanto a Escola R0 só possui vínculo tipado a Pauta/Tarefa, pilotos da Fábrica devem usar esses vínculos. Referências tipadas a caso/projeto fabril só entram depois de o domínio fabril existir e demonstrar necessidade.

## 5. Competências e perfil

Competência não é “curso assistido” nem declaração livre.

Modelo canônico futuro:

```text
conteúdo estudado
  + prática revisada
  + evidência de trabalho real
  → evidência de competência
```

Uma competência pode registrar:

- domínio, por exemplo CAD funcional;
- nível ou escopo demonstrado;
- evidências que sustentam a afirmação;
- data da última demonstração;
- revisor ou regra de validação;
- restrições de segurança;
- validade quando a competência exige atualização.

### Privacidade

Competências ficam privadas por padrão dentro de Minha Participação.

A pessoa escolhe explicitamente o que deseja tornar visível. Não expor automaticamente nível, produtividade, número de missões, localização, comunidade ou disponibilidade.

Não criar leaderboard geral.

### Uso operacional

Com autorização, competências podem ajudar a sugerir trabalho:

```text
projeto precisa de CAD + eletrônica
→ sistema encontra pessoas elegíveis
→ sugere oportunidade
→ pessoa escolhe assumir ou não
```

Competência nunca substitui autorização administrativa nem habilitação profissional legal.

## 6. Comunidades, núcleos e equipes

A Fábrica não cria um novo conceito de comunidade.

- Uma comunidade pode propor ou adotar um problema.
- Um trabalho temporário pode usar `comun_community_work_groups`.
- Tarefas continuam ligadas ao fluxo canônico.
- Um futuro **Núcleo Fábrica** é uma estrutura durável do bloco 49-A, com responsabilidades revisáveis.
- Papéis comunitários não autorizam automaticamente operação de máquinas; permissões técnicas/administrativas precisam de contrato próprio e server-side.

Exemplo:

```text
Comunidade Educação
  → pauta: calor nas escolas
  → ação: medir e testar intervenções
  → grupo de trabalho temporário
  → tarefa: fabricar 5 caixas de sensores
  → prática Escola: eletrônica / fabricação
  → Fábrica: projeto técnico e protótipo
  → resultado: sensores instalados
  → Observatório: recebe as medições
  → memória: o que funcionou e o que falhou
```

## 7. Caso FC sem criar uma segunda raiz social

O identificador `FC-XXXX` é útil para rastreabilidade operacional, mas “Caso FC” não deve competir com Pauta, Ação ou Tarefa.

No piloto 49-D1, o caso pode existir como registro operacional manual/derivado com links para objetos canônicos.

Somente depois da evidência do piloto, 49-D2 pode introduzir uma estrutura mínima, por exemplo:

- identidade técnica do caso;
- estado de triagem/fabricação;
- classe de risco;
- vínculo com Pauta/Ação/Tarefa;
- vínculo opcional com prática da Escola;
- custo técnico;
- versão técnica corrente.

Não copiar para o caso:

- título/síntese pública da pauta;
- lista de participantes da ação;
- tarefa e responsável;
- resultado público;
- progresso educacional;
- membership comunitária.

## 8. Projeto técnico e versionamento

Quando necessário, a Fábrica pode especializar o conceito de projeto técnico.

Um projeto pode conter:

- versão;
- arquivos CAD/STEP/STL quando cabível;
- BOM;
- material;
- parâmetros;
- instruções;
- testes;
- custo;
- licença;
- riscos e limites;
- compatibilidade;
- relação com instalações reais.

Evitar o padrão `final-final-agora-vai.stl`. Toda versão precisa ter identidade e histórico.

Publicação de arquivo técnico não é consequência automática de concluir um caso. Direitos, privacidade, segurança e revisão continuam obrigatórios.

## 9. Observatórios

A integração é bidirecional sem misturar responsabilidades.

### Observatório → Fábrica

Um achado pode gerar problema, pauta e ação que peçam uma solução física.

Exemplo: salas muito quentes → tarefa para fabricar caixas de sensores.

### Fábrica → Observatório

A Fábrica pode construir sensores ou instrumentos; os dados produzidos pertencem ao domínio do Observatório correspondente, com sua própria proveniência, metodologia e limites.

A Fábrica não deve criar dataset ambiental paralelo.

## 10. Minha Participação

Minha Participação continua sendo o centro pessoal.

Se 49-D estiver ativo, a pessoa pode ver no mesmo lugar:

- missões/estudo em andamento;
- práticas aguardando envio/revisão;
- tarefas assumidas;
- projetos técnicos em que participa;
- competências privadas;
- convites ou oportunidades sugeridas.

Não criar “Minha Fábrica” como dashboard concorrente.

## 11. Segurança

Classes candidatas:

- **R0 — expositivo/didático:** maquetes, placas, organizadores.
- **R1 — funcional de baixo risco:** caixas, suportes simples e acessórios.
- **R2 — falha pode causar dano material ou exposição relevante:** teste e revisão obrigatórios.
- **R3 — falha pode causar lesão ou risco técnico significativo:** especialista/responsável qualificado.
- **R4 — crítico:** não produzir no fluxo comunitário comum sem processo técnico, habilitação e responsabilidade adequados.

O nível técnico não pode ser “gamificado” para induzir trabalho inseguro.

Máquina liberada para uma pessoa não é consequência automática de uma competência registrada no perfil.

## 12. Fases

### 49-D0 — contrato

- arquitetura;
- linguagem;
- integração;
- limites;
- nenhum schema fabril.

### 49-D1 — piloto sem schema fabril

Meta mínima:

- 10 casos iniciados;
- 5 resolvidos;
- erros e inadequações documentados;
- verificar se tarefas/Pautas/Escola cobrem o trabalho.

Checkpoint ampliado FC-MVP-25:

- 25 casos;
- 15 resolvidos;
- 5 projetos abertos;
- 3 operadores autônomos;
- 5 pessoas em formação;
- 1 escola atendida;
- 1 projeto de acessibilidade;
- 1 tecnologia ambiental;
- 1 solução reutilizada.

### 49-D2 — extensão mínima

Somente criar schema específico para lacunas demonstradas no D1.

Critério de saída: caso/projeto técnico se liga aos objetos canônicos sem dual-write social ou educacional.

### 49-D3 — operação física

- máquinas;
- jobs;
- materiais;
- manutenção;
- instalações;
- falhas;
- custos.

Critério de saída: fila, rastreabilidade e segurança funcionam sem transformar atividade de máquina em métrica de valor social.

### 49-D4 — rede distribuída

- nós parceiros;
- capacidades;
- encaminhamento;
- replicações.

Critério de saída: ao menos uma solução é reproduzida por outro nó com documentação suficiente e sem intervenção operacional da sede.

## 13. Métricas

Métricas principais:

- problemas recebidos;
- problemas resolvidos;
- tempo até solução;
- soluções reutilizadas;
- pessoas que passaram a executar algo que antes não conseguiam;
- custo comunitário evitado;
- reparos versus fabricação nova;
- falhas em campo;
- replicações independentes.

Horas de impressão, quilos de material e quantidade de peças são métricas operacionais, não métricas centrais de impacto.

## 14. Regras de não duplicação

Antes de criar uma tabela, rota ou conceito novo, perguntar:

1. isso já é pessoa/identidade?
2. já é comunidade ou membership?
3. já é pauta?
4. já é roda?
5. já é ação ou tarefa?
6. já é progresso/prática da Escola?
7. já é resultado ou memória?
8. já pertence a um Observatório?
9. o novo dado é realmente específico de fabricação?

Somente a nona resposta positiva justifica uma extensão fabril.

## 15. Gate para implementação

Este contrato autoriza design e protótipos isolados. Não autoriza ativação pública da Fábrica.

Antes de iniciar migration própria:

1. Escola R0 precisa ter destino canônico estabilizado;
2. o piloto D1 precisa produzir casos reais;
3. as lacunas de dados precisam estar listadas com exemplos concretos;
4. precisa existir uma matriz RLS/privacidade;
5. precisa existir uma classificação de risco;
6. o desenho precisa comprovar ausência de duplicação de Pauta/Ação/Tarefa/Escola/Comunidade.

A regra é **prática → padrão → software**, e não software → procura por uso.
