# Tijolo 22 - Smoke

## Ambiente

- Servidor local: `http://localhost:3000`.
- Deploy executado: nao.
- Smoke contra producao: nao.
- Envio externo: nao.

## `smoke:reviewer-identity`

Cobertura executada:

- criou perfis admin teste;
- criou dossie teste;
- bloqueou revisao factual sem permissao pela regra;
- aprovou factual com usuario factual;
- bloqueou editorial pelo mesmo usuario pela regra de identidade;
- aprovou editorial com outro usuario;
- confirmou pronto para publicar;
- confirmou publicacao permitida apenas com revisores reais distintos;
- atribuiu responsaveis por perfil real;
- confirmou `Minhas pendencias` por usuario vinculado;
- confirmou auditorias de identidade no codigo;
- confirmou que rota publica nao mostra perfil admin, e-mail ou identidade interna;
- limpou dados de teste.

## Smokes relacionados

- `smoke:pauta-dossier-review-queue`: passou.
- `smoke:pauta-dossier-review-ops`: passou.
- `smoke:admin-notifications`: passou.

## Resultado

Smoke aprovado.
