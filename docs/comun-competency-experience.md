# COMUN 49-C2 — experiência de competências em Minha Participação

Status: contrato de interface candidato, desconectado de banco e de produção. Não cria nova rota, aba pública, feature flag ativa ou mutation.

## Objetivo

Preparar a experiência pessoal de competências sem antecipar um schema ainda bloqueado pelo 49-C1/Escola R0.

A superfície pertence a **Minha Participação**. Não existe “Meu currículo COMUN”, perfil competitivo ou dashboard separado.

## Estados humanos

### Construindo evidência

A pessoa está praticando ou possui uma claim proposta sem evidência suficiente.

Mensagem central:

> Continue praticando em trabalho real. Estudo sozinho não conclui esta competência.

### Aguardando revisão

Existe evidência ligada à claim, mas ainda não há demonstração válida e independente.

### Demonstrada

Há evidência validada para o escopo declarado.

Dois controles permanecem independentes:

- **Perfil público:** privado / visível por escolha;
- **Sugestões de tarefas:** desligadas / permitidas.

Publicar não liga matching. Ligar matching não publica.

### Precisa revisar

A competência precisa de nova demonstração antes de ser usada para matching.

### Arquivada

Não representa capacidade vigente e não entra em matching.

## Ordem da interface

Itens que exigem atenção aparecem primeiro:

1. precisa revisar;
2. aguardando revisão;
3. construindo evidência;
4. demonstrada;
5. arquivada.

Isso evita transformar a área em vitrine de medalhas.

## Privacidade da apresentação

O view model não inclui:

- reviewer;
- sourceId;
- reflexão privada;
- pauta/tarefa privada;
- notas de revisão;
- contagem de erros;
- ranking;
- disponibilidade.

A UI pode mostrar quantidade de evidências ligadas, mas isso não é pontuação.

## Componente preparado

`components/comun-competency-panel.tsx` recebe apenas cartões já sanitizados.

Ele ainda não é importado por Minha Participação. Essa escolha é deliberada: sem dados reais e feature gate, conectar o componente criaria uma superfície vazia que aparentaria capacidade pronta.

## Próximo gate

Para ligar o painel a Minha Participação:

1. #503/Escola R0 precisa estabilizar;
2. 49-C1 precisa definir schema/RLS;
3. loader privado precisa retornar apenas claims da própria pessoa;
4. mutations de publicação e matching precisam ser separadas e auditáveis;
5. feature flag inicia OFF;
6. ensaio com contas reais deve provar que nenhuma evidência privada aparece no HTML ou payload público.

O 49-C2 está pronto quando a interface pode ser conectada sem alterar seu modelo mental nem suas garantias de privacidade.
