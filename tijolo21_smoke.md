# Tijolo 21 - Smoke

## Ambiente

- Servidor local: `http://localhost:3000`.
- Deploy executado: nao.
- Smoke contra producao: nao.
- Envio externo: nao.

## `smoke:admin-notifications`

Cobertura executada:

- criou pauta teste;
- criou dossie teste;
- criou notificacoes internas;
- marcou notificacao como lida;
- arquivou notificacao;
- gerou notificacao de vencido;
- gerou notificacao de pronto para publicacao;
- confirmou pagina admin de notificacoes;
- confirmou que rota admin sem sessao nao expoe conteudo interno;
- confirmou que notificacoes internas nao aparecem na rota publica;
- limpou dados de teste.

## Smokes relacionados

- `smoke:pauta-dossier-review-queue`: passou.
- `smoke:pauta-dossier-review-ops`: passou.

## Resultado

Smoke aprovado.
