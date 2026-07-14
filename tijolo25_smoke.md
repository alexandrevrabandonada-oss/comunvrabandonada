# Tijolo 25 - Smokes

Data: 2026-07-08

Ambiente: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Executados

- `npm run smoke:dossier-publication-snapshots`: passou.
- `npm run smoke:public-dossier-page`: passou.

## Cobertura do smoke novo

- Cria pauta e dossie de teste.
- Cria snapshot publico ativo.
- Abre `/comun/dossies/[slug]`.
- Confirma titulo, resumo, corpo e blocos publicos.
- Confirma metadata social seguro.
- Confirma changelog publico limitado.
- Edita draft e confirma que a pagina publica nao muda.
- Simula versao revisada originada de rollback sem expor a palavra `rollback`.
- Despublica snapshot e confirma que a pagina nao revela dados internos.
- Confirma ausencia de campos internos, e-mails, papeis, checklist, auditoria, storage path e signed URL.
- Limpa dados de teste.
