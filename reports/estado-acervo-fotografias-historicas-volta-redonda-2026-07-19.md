# Estado do acervo — fotografias históricas de Volta Redonda

Data da checagem: 19/07/2026  
Escopo: lote indicado como fotografias de Volta Redonda entre as décadas de 1940 e 1980.

## Resultado executivo

O lote foi incorporado ao acervo como uma coleção privada de revisão, com o título **Volta Redonda em formação — fotografias históricas, 1940–1989**. Nenhuma fotografia foi publicada. Os originais foram preservados no bucket privado, identificados por SHA-256 e ligados a registros editoriais idempotentes.

Estado remoto reconciliado:

- coleção: `volta-redonda-em-formacao-1940-1989`;
- estado da coleção: `review`, sem data de publicação;
- 963 arquivos JPEG encontrados;
- 860 conteúdos únicos;
- 103 duplicatas exatas, detectadas por SHA-256 e não retransmitidas;
- 860 itens privados de fotografia;
- 860 originais no storage privado;
- 860 vínculos com a coleção;
- 0 itens publicados;
- volume único preservado: 189,06 MiB.

O inventário reprodutível de arquivos, hashes, dimensões, duplicatas e inferências de data está em `reports/manifesto-fotografias-historicas-volta-redonda-1940-1989.json`.

## Estudo curatorial

A amostragem visual indica que o melhor lugar para o lote é o acervo histórico, organizado por uma coleção transversal sobre a formação de Volta Redonda. Não é recomendável separar imediatamente por década: apenas 9 dos 860 conteúdos únicos trazem uma data utilizável no nome, e associações visuais sem pesquisa documental podem criar informação histórica falsa.

Os núcleos curatoriais sugeridos para a etapa de pesquisa são:

1. formação urbana, bairros, ruas e paisagem;
2. CSN, obras, indústria e infraestrutura;
3. trabalho, comércio, mobilidade e serviços;
4. escolas, equipamentos públicos e arquitetura;
5. festas, esportes e vida comunitária;
6. retratos, famílias e memória privada;
7. reproduções, recortes e materiais gráficos.

Esses núcleos devem ser aplicados como assuntos após identificação humana, não como classificação automática definitiva. Uma mesma fotografia poderá integrar mais de um núcleo.

## Qualidade, direitos e privacidade

- 851 imagens continuam com data a confirmar.
- Autoria, proveniência específica e licença permanecem como desconhecidas.
- Pessoas retratadas, especialmente crianças, famílias e cenas privadas, exigem análise de privacidade e contexto.
- Imagens que sejam recortes, cartazes ou reproduções podem envolver direitos adicionais do fotógrafo e da publicação de origem.
- `VISTA DO ALTO DO MORRO DA TORRE.JPG` tem cabeçalho JPEG corrompido; o original foi preservado e marcado como `review_required`, sem falsa indicação de integridade verificada.
- Não foram geradas derivadas públicas, URLs públicas ou créditos presumidos.

## Implementação realizada

- criado o bucket remoto `archive-private-originals` como privado, com limite de 30 MiB e tipos de imagem restritos;
- criado o importador `scripts/import-comun-historical-photo-batch.mjs`;
- adicionados modos dry-run e apply, filtro de arquivo, limite, concorrência controlada e exportação de manifesto;
- deduplicação por conteúdo, títulos conservadores e inferência restrita de datas;
- proteção contra execução acidental em Supabase local ou sem confirmação explícita;
- retomada idempotente após falha transitória de upload;
- reconciliação independente entre itens, assets e vínculos da coleção.

## Gate recomendado para publicação

Publicar somente lotes pequenos, após cada item cumprir simultaneamente:

1. identificação de local, acontecimento e data ou faixa temporal, com nível de confiança;
2. autoria e fonte registradas sem inferência indevida;
3. decisão documentada de direitos de exibição;
4. revisão de privacidade e sensibilidade das pessoas retratadas;
5. legenda, texto alternativo e crédito editorial aprovados;
6. geração de derivada pública separada do original preservado.

A primeira pauta de pesquisa recomendada é um piloto de 20 a 30 imagens com nomes descritivos e marcos públicos reconhecíveis. Retratos familiares e arquivos numéricos devem ficar para rodadas assistidas por moradores, pesquisadores e instituições locais.

## Conclusão

O lote está tecnicamente preservado, privado, deduplicado e pronto para pesquisa curatorial. O acervo ganhou uma base segura para catalogação sem transformar incertezas em fatos nem expor originais. A próxima etapa correta é identificação humana e validação de direitos; não há justificativa para publicação automática do conjunto.
