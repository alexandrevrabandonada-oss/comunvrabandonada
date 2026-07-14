# Tijolo 27 - Smoke

Data: 2026-07-08
Smoke: `npm run smoke:public-dossier-navigation`
URL: http://localhost:3000

## Cobertura

- cria pauta publica de teste;
- usa comunidade publica existente;
- cria multiplos dossies com snapshots ativos;
- cria dossie sem snapshot e confirma que nao aparece;
- cria snapshot `superseded` e confirma que nao aparece;
- cria snapshot `unpublished` e confirma que nao aparece;
- abre dossie publico e confirma breadcrumb;
- confirma bloco de pauta relacionada;
- confirma bloco de comunidade relacionada;
- confirma dossies relacionados;
- abre pauta e confirma dossies publicados;
- abre comunidade e confirma dossies publicados;
- abre indice e confirma links de filtro por pauta, comunidade e categoria;
- confirma ausencia de campos internos e sensiveis;
- limpa dados de teste.

## Resultado

Passou localmente.
