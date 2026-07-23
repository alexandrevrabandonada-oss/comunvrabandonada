# Readiness do mapa-base real — Sprint 38

## Decisão

Provider ativo: `localSynthetic`.
Provider remoto: não selecionado e não ativado.
Tiles remotos utilizados: não.

## Contrato preparado

A interface `SidewalkBasemapProvider` define identidade, tipo, atribuição, política de cache, configuração de estilo, fallback e disponibilidade. O seletor recusa provider real sem configuração explícita e retorna o modo sintético.

## Requisitos antes de escolher fornecedor

- decisão documentada sobre fornecedor, licença e atribuição;
- política de cache compatível com os termos do serviço;
- estimativa de custo e limites;
- política de privacidade para requisições de tiles;
- style URL/configuração sem segredo no cliente;
- teste de indisponibilidade e fallback;
- alternativa em lista plenamente funcional;
- revisão de acessibilidade e contraste;
- autorização explícita para serviço remoto.

## Falha e modo sem mapa-base

Se um provider real estiver indisponível, a camada de registros continua operável sobre fundo neutro e a lista preserva busca, filtros e deep links. A falha do mapa-base não pode ocultar registros nem bloquear contribuições.

## Pendências

Fornecedor, licença, atribuição final, cache e orçamento permanecem deliberadamente em aberto. Não houve acesso a tiles, Supabase remoto, R2 ou qualquer serviço externo nesta Sprint.
