# Acervo vivo

O Acervo organiza fotografias históricas, documentos, lugares de memória, artistas, lançamentos, histórias orais, cartazes e jornais sem misturá-los ao fluxo urgente de relatos.

## Fluxo editorial

1. O editor cria o item e registra fonte, data, lugar, autoria, créditos e direitos.
2. O original é enviado ao bucket privado.
3. Uma versão pública separada é preparada, enviada ao bucket público e revisada.
4. A publicação só é liberada com direitos definidos, fonte, créditos, asset público aprovado e texto alternativo nas imagens.
5. Despublicar remove o item das rotas abertas sem apagar o original.

Direitos `unknown` e `restricted` bloqueiam publicação. Música aceita somente `external_link_only`; arquivos de áudio e vídeo são bloqueados neste sprint.

As rotas públicas selecionam campos explicitamente e nunca retornam notas editoriais, referência interna de permissão, object keys privados ou dados de contribuidores.
