# Estado atual — Territórios e Mapas

**Projeto:** COMUN VR Abandonada  
**Data da auditoria:** 20 de julho de 2026  
**Escopo:** experiência pública, participação, administração, dados e privacidade

## Resumo executivo

Hoje o projeto possui três superfícies relacionadas:

1. **Territórios** (`/comun/territorios`): diretório de municípios, bairros, comunidades, equipamentos e outros recortes territoriais.
2. **Mapa Popular** (`/comun/mapa`): visualização transversal de pontos, organizações, áreas, fontes e necessidades territoriais.
3. **Mapa Popular das Calçadas**: módulo especializado dentro da pauta `/comun/pautas/calcadas-em-circulacao`, com registros comunitários próprios.

As três superfícies compartilham relações com pautas, ações, resultados e acervo, mas não representam a mesma base operacional. O Mapa Popular geral usa `comun_hub_territories`; a vertical de calçadas usa principalmente `comun_sidewalk_records`.

O fluxo editorial e as proteções de dados já têm uma boa fundação. Entretanto, os mapas exibidos hoje são **representações esquemáticas**, não cartografia geográfica: os pontos do mapa geral são distribuídos visualmente a partir das coordenadas, e os registros de calçadas são posicionados por índice. O formulário de calçadas grava uma coordenada fixa provisória. Portanto, a interface não deve ser interpretada como localização precisa dos problemas.

## 1. Diretório de Territórios

### Rotas

- `/comun/territorios`: lista territórios não arquivados.
- `/comun/territorios/[slug]`: ficha agregadora de um território.
- `/comun/admin/territorio`: administração acessível a perfis `admin` e `editor`.

### O que a ficha territorial reúne

- resumo público;
- pautas ativas;
- próximas ações;
- observatórios relacionados;
- obras territoriais e episódios de rádio;
- resultados e memórias vinculadas ao acervo;
- chamada para participação.

O território atua como eixo de navegação. Ele conecta iniciativas já existentes sem copiar registros entre módulos.

### Modelo principal

A raiz é `comun_hub_territories`. Um território pode receber especializações e relações:

- camadas por `comun_territory_layers`;
- pontos de reciclagem;
- organizações territoriais;
- propriedades ou áreas de interesse público;
- necessidades;
- fontes e alegações editoriais;
- pautas, ações, resultados, observatórios, obras, rádio e acervo.

## 2. Mapa Popular geral

### Experiência pública

A rota `/comun/mapa` oferece três modos:

- **Mapa:** painel esquemático com marcadores selecionáveis;
- **Lista:** cartões com tipo, verificação, bairro ou município e resumo;
- **Frentes:** agrupamento pelas camadas territoriais ativas.

O filtro por camada funciona na interface. Ao selecionar um marcador, uma ficha lateral apresenta resumo e ligação para `/comun/mapa/[slug]`.

### Critérios públicos

O carregamento do mapa inclui somente territórios que:

- possuem `visibility = public`;
- não estão arquivados;
- não possuem verificação `unverified`.

Coordenadas com precisão `hidden` não são devolvidas. As demais são arredondadas conforme `location_precision`:

- `exact`: cinco casas decimais;
- `approximate`: três casas;
- outros níveis públicos: duas casas.

### Ficha de um item

`/comun/mapa/[slug]` pode apresentar:

- situação e localização pública;
- data da última revisão;
- reciclagem e materiais aceitos;
- organização, serviços e território de atuação;
- área de interesse público e alegações com linguagem cautelosa;
- propostas comunitárias;
- fontes revisadas;
- necessidades abertas;
- ações, resultados e vínculos com o Acervo Vivo.

Informações de propriedade são redigidas conforme o tipo e a fonte da alegação. A interface avisa que propostas comunitárias não equivalem a decisões oficiais.

### Limitação cartográfica atual

O mapa não usa uma biblioteca cartográfica, tiles ou projeção geográfica. O desenho de vias é um SVG ilustrativo. Mesmo quando existem coordenadas públicas, a posição visual do marcador é calculada para caber no painel e **não corresponde fielmente à geografia de Volta Redonda**.

## 3. Mapa Popular das Calçadas

### Onde aparece

A vertical é exibida como módulo de mapa na pauta:

- `/comun/pautas/calcadas-em-circulacao`

As fichas públicas ficam em:

- `/comun/pautas/[pauta]/registros/[registro]`;
- memórias de ciclo em `/comun/pautas/[pauta]/memoria/[memoria]`.

O atalho direto de contribuição é:

- `/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao`.

### Conteúdo público

Somente registros com `visibility = public` e estado `verified` ou `published` são apresentados. Antes da publicação, o código remove campos privados e aplica o nível público de localização.

O módulo mostra:

- mapa ou lista;
- quantidade publicada;
- registros verificados;
- registros de alto impacto;
- registros resolvidos;
- aviso de cobertura insuficiente quando existem menos de três registros;
- declaração metodológica de que a amostra não representa levantamento completo.

### Participação autenticada

Para registrar um problema de calçada, a pessoa precisa ter sessão comunitária. O fluxo tem quatro etapas:

1. foto;
2. local aproximado;
3. categoria, impacto e descrição;
4. revisão e envio.

O rascunho fica no armazenamento local do navegador e pode sobreviver à navegação ou indisponibilidade momentânea. No envio:

- o registro nasce como `under_review`, `community_report` e `internal`;
- o usuário é associado privadamente por `member_user_id`;
- a foto original vai para storage privado;
- o item fotográfico nasce privado e em rascunho;
- a foto só pode ganhar derivada pública após revisão;
- a pessoa entra como participante da pauta;
- a caixa de entrada recebe confirmação de recebimento;
- o acompanhamento segue pela área do membro.

Categorias atuais: calçada irregular, ausência de rampa, obstáculo e buraco. Impacto: baixo, médio ou alto.

### Limitação geográfica atual

O fluxo solicita texto de localização aproximada, mas ainda não coleta um ponto real no mapa. Todos os novos registros recebem provisoriamente o mesmo GeoJSON (`Point`) interno. Na superfície pública, os seis primeiros marcadores são distribuídos por índice em um fundo ilustrativo. O botão visual “Filtros” ainda não executa filtragem.

## 4. Contribuição territorial geral

Fora da vertical de calçadas, `/comun/mapa/contribuir` aceita relatos sobre:

- ponto novo ou correção;
- materiais aceitos e ponto lotado;
- organização ou cooperativa;
- necessidade;
- imóvel ou terreno;
- documento;
- uso social;
- histórico.

Nada altera o mapa automaticamente. O envio cria uma contribuição `pending` para moderação. Resumo, localização aproximada, detalhes privados e contato são separados.

Este formulário geral não exige autenticação. Ele possui honeypot e limite de cinco envios diários calculado por hash do contato e da data.

## 5. Administração e moderação

O painel `/comun/admin/territorio` permite:

- criar entidade territorial;
- definir camada, GeoJSON, precisão, verificação e visibilidade;
- especializar como reciclagem, organização ou propriedade;
- criar necessidade;
- cadastrar fonte e atribuição;
- acompanhar totais de contribuições, itens sem verificação, necessidades e fontes pendentes.

As ações exigem `admin` ou `editor`, usam cliente server-side e geram auditoria administrativa. O GeoJSON é limitado por tipo, coordenadas e tamanho. A publicação depende de decisão explícita de visibilidade e verificação.

## 6. Pontos fortes atuais

- separação entre dados públicos e localização ou contato privado;
- moderação anterior à publicação;
- fotos de calçadas privadas por padrão;
- vínculo privado da contribuição ao membro;
- fontes e níveis de verificação explícitos;
- linguagem cautelosa para propriedade e disputa;
- articulação com pauta, ação, resultado, observatório, rádio, arte e acervo;
- RLS nas tabelas da vertical de calçadas;
- estados vazios e alerta de baixa cobertura;
- interface responsiva com alternativas de mapa e lista.

## 7. Lacunas e riscos identificados

### Alta prioridade

1. **Visibilidade do diretório de Territórios:** `listPublicTerritories` e `getPublicTerritory` usam cliente de serviço e filtram apenas itens não arquivados, sem exigir `visibility = public`. Isso pode expor nome, resumo e relações de um território interno. O Mapa Popular geral aplica corretamente o filtro público, mas o diretório de Territórios precisa ser corrigido e coberto por teste.

2. **Mapa de calçadas ainda não geográfico:** novos registros recebem uma coordenada fixa e a visualização distribui marcadores artificialmente. A aparência de mapa pode sugerir precisão inexistente.

### Média prioridade

3. **Botão de filtros das calçadas sem função:** o controle está visível, mas não possui ação ou painel associado.

4. **Mapa geral esquemático:** coordenadas são usadas para dispersão visual, não para posicionamento cartográfico real. É preciso reforçar o aviso ou adotar um mapa geográfico acessível.

5. **Limite do formulário anônimo:** envios sem contato produzem o mesmo hash diário, fazendo pessoas distintas compartilharem o limite de cinco contribuições. Com contato variável, o limite também é fácil de contornar.

6. **Administração fragmentada:** existe painel territorial geral, mas a fila completa de moderação e publicação de registros de calçada não está concentrada nessa mesma superfície.

### Baixa prioridade

7. O modo de mapa das calçadas exibe no máximo seis registros, enquanto a lista também usa o mesmo corte.

8. O Mapa Popular possui funções de filtragem por busca, material e verificação na biblioteca, mas a interface atual expõe apenas camadas.

## 8. Próximos passos recomendados

1. Corrigir imediatamente as consultas públicas de `/comun/territorios` para exigir `visibility = public` e testar a não exposição de registros internos.
2. Rotular os dois mapas como “representação aproximada” até existir cartografia real.
3. Implementar captura de localização por seleção manual, sem GPS obrigatório, preservando níveis `hidden`, bairro e aproximado.
4. Substituir a coordenada fixa dos registros de calçada por geometria moderada e sanitizada.
5. Tornar funcionais os filtros de categoria, impacto, situação e território na vertical de calçadas.
6. Expor no mapa geral os filtros já suportados por busca, material e verificação.
7. Criar uma fila administrativa única para contribuição territorial e calçadas, com idade, risco, privacidade da foto e decisão editorial.
8. Revisar o rate limit anônimo para não depender apenas do contato informado.
9. Medir cobertura por bairro ou trecho e apresentar data da última revisão sem produzir falsa sensação de completude.

## Conclusão

A arquitetura atual já suporta uma rede territorial rica e uma vertical comunitária moderada para calçadas. O principal trabalho pendente não é criar outra área, mas tornar a geografia verdadeira e compreensível, unificar a operação editorial e fechar a falha de visibilidade do diretório público. Até isso acontecer, o Mapa Popular e o mapa das calçadas devem ser tratados como superfícies editoriais aproximadas, não como mapas técnicos de localização.
