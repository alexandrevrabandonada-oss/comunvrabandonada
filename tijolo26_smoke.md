# Tijolo 26 - Smokes

Data: 2026-07-08

Ambiente: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Executados

- `npm run smoke:dossier-publication-snapshots`: passou.
- `npm run smoke:public-dossier-page`: passou.
- `npm run smoke:public-dossier-index`: passou.

## Cobertura do smoke novo

- Cria dossies com snapshots publicados.
- Cria dossie sem snapshot e confirma que nao aparece.
- Cria snapshot `superseded` e confirma que nao aparece.
- Cria snapshot `unpublished` e confirma que nao aparece.
- Confirma cards publicos.
- Confirma filtros por pauta, comunidade e categoria.
- Confirma busca publica.
- Confirma rota individual funcionando.
- Confirma ausencia de campos internos.
- Limpa dados de teste.
