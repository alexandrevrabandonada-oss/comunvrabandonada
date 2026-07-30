# Contrato de experiência dos miniapps do COMUN

## Propósito

Um miniapp é uma ferramenta especializada de uma pauta. Ele não substitui comunidade, ação coletiva, protocolo, resultado ou memória. Ele reutiliza o registro canônico de módulos de pauta e deve manter visíveis o território, a comunidade responsável e o caminho de volta ao COMUN.

O contrato executável está em `lib/miniapp-contract.ts`. A registry de módulos
continua sendo `lib/comun/pauta-module-registry.ts`; não há segunda tabela nem
segunda fonte de verdade. Cada definição declara uma versão, rotas, contexto,
permissões, estados, projeção pública, capacidades políticas, auditoria,
privacidade e retenção.

## Contexto obrigatório

Todo miniapp público deve declarar:

- pauta de origem;
- território e cobertura;
- comunidade responsável;
- uma ação principal;
- forma de contribuição;
- acompanhamento unificado em Minha área;
- consequência coletiva esperada;
- mobilização relacionada;
- resultado verificável;
- memória do processo.

O shell global permanece responsável por marca, busca, Caixa de entrada, perfil e navegação móvel. O `MiniAppExperienceShell` acrescenta somente contexto e navegação local.

## Entradas e retornos

Entradas válidas: Home, Território, Comunidade, Pauta, Busca e Minha área.

Retornos obrigatórios: Minha área, Caixa de entrada, prioridade, ação, resultado, memória e comunidade. Deep links devem apontar para a rota específica e nunca depender de uma âncora numa página longa.

## Anatomia

1. Cabeçalho compacto: título, ícone, pauta, comunidade, território, cobertura, status e ação principal.
2. Navegação local, visualmente distinta da navegação global.
3. Uma tarefa dominante por tela.
4. Estados vazios com contexto e próxima ação.
5. Lista semanticamente equivalente quando a visualização principal for mapa.

## Regras de linguagem e segurança

- ação e destaque usam amarelo e preto; leitura longa usa fundo claro;
- caixa alta fica restrita a rótulos curtos;
- condição, verificação e encaminhamento são dimensões distintas;
- resposta institucional não equivale a resultado comprovado;
- cobertura parcial nunca é apresentada como levantamento completo;
- dados privados, originais e coordenadas protegidas não entram na projeção pública;
- nenhuma integração remota é ativada implicitamente.
- conflitos de attempt, run, pauta ou projeção pública falham fechados;
- capacidades são opcionais, mas pauta, território, comunidade, contribuição,
  alternativa textual, participação, Inbox e administração são explícitos.

## Aplicação no Mapa das Calçadas

- pauta: `calcadas-em-circulacao`;
- território: Volta Redonda;
- comunidade: a comunidade pública vinculada à pauta;
- ação principal: registrar calçada;
- navegação local: Mapa, Prioridades, Mobilização e Resultados;
- acompanhamento: Minha área e Caixa de entrada;
- definição executável: `lib/sidewalk-miniapp-definition.ts`;
- cartografia padrão: PMTiles canônico de Volta Redonda, com grade neutra e
  lista equivalente como fallback;
- contribuição: sessão anônima limitada, upload privado e moderação antes da
  projeção pública;
- ciclo político: prioridade, ação, protocolo, resposta, verificação de campo,
  resultado e memória usam entidades canônicas já existentes.

Não foi criada uma segunda registry nem uma nova tabela.

Uma definição sintética de agenda cultural existe somente em teste para provar
desacoplamento. Ela não cria rota, dado ou miniapp público.
