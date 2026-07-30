# Tijolo 47.2 — Núcleo público entregável

Resultado em preparação: `COMUN_V1_PUBLIC_CORE_IN_PROGRESS`

## Findings confirmados em produção

1. a Home exibia `Ambiente de demonstração · conteúdo sintético`;
2. o Mapa das Calçadas exibia `registros demonstrativos`, apesar de já possuir contribuição real;
3. a Home listava itens do acervo criados por smokes controlados;
4. a derivada pública sanitizada da primeira contribuição estava acessível no acervo com título e descrição internos incompatíveis: `Foto privada de registro de calçada` e `Imagem aguardando revisão de privacidade`;
5. a auditoria usava `em construção` como marcador genérico, embora essa expressão seja legítima para pautas em processo.

## Correção

- o aviso global passa a dizer `Versão em preparação · acesso piloto`;
- o mapa passa a identificar `contribuições revisadas`;
- foi criado um contrato central de conteúdo público entregável;
- slugs de smoke/fixture e metadados editoriais técnicos são bloqueados nas superfícies públicas;
- Home, busca, acervo, coleções e experiências territoriais usam a mesma fronteira;
- o detalhe direto de um item incoerente retorna indisponível até que sua curadoria pública seja corrigida;
- a derivada pública da calçada permanece disponível no mapa, sem apagar o original ou o registro;
- o detector de launch readiness passou a usar marcadores precisos.

## Fronteira

- nenhuma linha do banco foi alterada;
- nenhum objeto de Storage foi removido;
- nenhum registro público da calçada foi despublicado;
- nenhum dado privado foi lido ou copiado para artifacts;
- itens de teste permanecem disponíveis apenas para administração e auditoria;
- o lançamento integral continua bloqueado.
