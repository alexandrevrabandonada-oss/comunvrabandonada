# Tijolo 28-R1 - Smoke

Data: 2026-07-08
Ambiente: local

## Smokes executados

- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:public-dossier-index` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:public-dossier-navigation` - passou
- `NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run smoke:public-dossier-features` - passou

## Cobertura confirmada por `smoke:public-dossier-features`

- cria dossies com snapshots ativos;
- marca snapshot como destaque;
- confirma destaque em `/comun/dossies`;
- confirma destaque em `/comun`;
- confirma destaque/listagem na pagina de pauta;
- desativa destaque e confirma remocao da area publica;
- confirma que destaque de snapshot `superseded` nao aparece;
- confirma que destaque de snapshot `unpublished` nao aparece;
- confirma recomendacoes por recentes, atualizados, pauta, comunidade e categoria;
- confirma ausencia de campos internos;
- limpa dados de teste.

## Resultado

Aceite funcional concluido localmente.
