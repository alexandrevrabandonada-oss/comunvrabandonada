# Checklist GO/NO-GO

## GO

- [ ] `npm run verify:rc-local` passou.
- [ ] `RLS_MATRIX_OK`.
- [ ] `RLS_MATRIX_SMOKE_OK`.
- [ ] Todos os smokes principais passaram.
- [ ] Nenhum dado sensivel exposto em rota publica.
- [ ] Docs atualizados.
- [ ] Backup remoto confirmado.
- [ ] Admin real de producao confirmado.
- [ ] Janela de release definida.
- [ ] Decisao humana registrada.

## NO-GO

- [ ] Qualquer smoke critico falhou.
- [ ] Qualquer tabela sensivel esta sem RLS.
- [ ] Qualquer rota publica vaza campo interno.
- [ ] Migrations inconsistentes ou fora de ordem.
- [ ] Falta admin real preparado para producao.
- [ ] Falta backup.
- [ ] Nao ha autorizacao explicita para producao.
- [ ] Equipe nao consegue acompanhar rollback.

## Decisao

- [ ] GO
- [ ] NO-GO

Responsavel:

Data/hora:

Observacoes:
