# Tijolo 24 - Smokes

Data: 2026-07-08

Ambiente: `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001`.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Smokes executados

- `npm run smoke:pauta-dossier-review-queue`: passou.
- `npm run smoke:pauta-dossier-review-ops`: passou.
- `npm run smoke:admin-notifications`: passou.
- `npm run smoke:reviewer-identity`: passou.
- `npm run smoke:admin-team`: passou.
- `npm run smoke:dossier-publication-snapshots`: passou.

## Cobertura do smoke novo

- Cria pauta, dossie e perfis reais de revisao/publicacao.
- Confirma dupla revisao real distinta.
- Preenche checklist final.
- Cria snapshot publicado.
- Confirma que a rota publica usa snapshot.
- Edita draft depois da publicacao e confirma que a pagina publica nao muda.
- Publica nova versao e supersede a anterior.
- Despublica com motivo e remove a rota publica.
- Faz rollback para snapshot anterior.
- Confirma auditorias esperadas no codigo.
- Confirma ausencia de vazamento publico de campos sensiveis.
- Limpa dados de teste.

## Fechamento R1

Ambiente: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

- `npm run smoke:pauta-dossier-review-queue`: passou.
- `npm run smoke:pauta-dossier-review-ops`: passou.
- `npm run smoke:admin-notifications`: passou.
- `npm run smoke:reviewer-identity`: passou.
- `npm run smoke:admin-team`: passou.
- `npm run smoke:dossier-publication-snapshots`: passou.

O smoke de snapshots confirmou pagina publica baseada em snapshot imutavel, edicao posterior do rascunho sem alterar publicacao, nova publicacao com snapshot anterior `superseded`, despublicacao com motivo e rollback funcional.
