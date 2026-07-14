# Tijolo 23 - Smoke

## Ambiente

- Servidor local: `http://localhost:3000`.
- Deploy executado: nao.
- Smoke contra producao: nao.
- Envio externo: nao.

## `smoke:admin-team`

Cobertura executada:

- criou perfil admin teste;
- criou perfil factual;
- criou perfil editorial;
- criou perfil publisher;
- criou perfil viewer;
- editou papel;
- desativou perfil;
- confirmou bloqueio de atribuicao de perfil inativo pela regra;
- confirmou matriz basica de permissoes;
- confirmou protecao de ultimo admin no codigo/regra;
- confirmou auditorias;
- confirmou rota `/comun/admin/equipe` protegida sem sessao;
- confirmou que rota publica nao mostra e-mails, perfis ou papeis internos;
- limpou dados de teste.

## Smokes relacionados

- `smoke:pauta-dossier-review-queue`: passou.
- `smoke:pauta-dossier-review-ops`: passou.
- `smoke:admin-notifications`: passou.
- `smoke:reviewer-identity`: passou.

## Resultado

Smoke aprovado.
