# Tijolo 28 - Smoke

Data: 2026-07-08
Smoke novo: `npm run smoke:public-dossier-features`
URL esperada: http://localhost:3000

## Cobertura criada

- cria dossies com snapshots ativos;
- marca um snapshot como destaque;
- confirma destaque em `/comun/dossies`;
- desativa destaque e confirma remocao;
- cria destaque para snapshot `superseded` e confirma ausencia publica;
- cria destaque para snapshot `unpublished` e confirma ausencia publica;
- confirma secoes de recentes e atualizados;
- confirma recomendacoes por pauta, comunidade e categoria;
- confirma bloco de destaque em `/comun`;
- confirma pagina de pauta com dossies ativos;
- confirma ausencia de campos internos;
- limpa dados de teste.

## Resultado executado

Bloqueado por banco local/autorizado ainda sem a tabela `comun_public_dossier_features`.

Smokes relacionados que passaram:

- `smoke:public-dossier-index`
- `smoke:public-dossier-navigation`
