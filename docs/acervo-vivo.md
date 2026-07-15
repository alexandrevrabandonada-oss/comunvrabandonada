# Acervo vivo

O Acervo organiza fotografias históricas, documentos, lugares de memória, artistas, lançamentos, histórias orais, cartazes e jornais sem misturá-los ao fluxo urgente de relatos.

História Oral usa originais privados, consentimento granular, transcrição versionada e publicação seletiva. Consulte `docs/acervo-historia-oral.md`.

## Fluxo editorial

1. O editor cria o item e registra fonte, data, lugar, autoria, créditos e direitos.
2. O original é enviado ao bucket privado.
3. Uma versão pública separada é preparada, enviada ao bucket público e revisada.
4. A publicação só é liberada com direitos definidos, fonte, créditos, asset público aprovado e texto alternativo nas imagens.
5. Despublicar remove o item das rotas abertas sem apagar o original.

Direitos `unknown` e `restricted` bloqueiam publicação. Música aceita somente `external_link_only`; arquivos de áudio e vídeo são bloqueados neste sprint.

As rotas públicas selecionam campos explicitamente e nunca retornam notas editoriais, referência interna de permissão, object keys privados ou dados de contribuidores.

# Sprint 21 — fotografias

O Acervo Vivo aceita contribuicoes fotograficas em fluxo separado de relatos urgentes. Originais permanecem privados; a galeria usa derivados revisados e filtros compartilháveis por cidade, bairro, lugar e decada.
# Memória musical

Artistas e lançamentos reutilizam os itens, relações, ativos e coleções do Acervo. Perfis especializados, discografias, faixas e links ficam conectados ao item principal; nenhuma contribuição é publicada automaticamente.
# Arte dos Territórios

O Acervo inclui obras territoriais contextualizadas, com agents, créditos múltiplos, direitos granulares, original privado, derivadas públicas aprovadas e relações com pautas. Consulte `docs/comun-arte-territorios.md`.
