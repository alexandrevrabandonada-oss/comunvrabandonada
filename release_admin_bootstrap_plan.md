# Plano de bootstrap admin de producao

Este plano nao deve ser executado neste tijolo.

## Pre-requisitos

1. Usuario real criado no Supabase Auth de producao.
2. E-mail confirmado.
3. Pessoa responsavel definida.
4. Backup remoto confirmado.
5. Autorizacao explicita para operacao em producao.

## Bootstrap

1. Rodar somente quando autorizado:

```bash
npm run bootstrap:admin -- --email email@exemplo.com
```

2. Confirmar registro em `comun_admin_profiles`.
3. Confirmar papel `admin`.
4. Confirmar `active=true`.
5. Confirmar protecao de ultimo admin ativo.

## Validacao

1. Abrir `/comun/admin` sem sessao e confirmar bloqueio.
2. Login com admin real.
3. Abrir `/comun/admin/equipe`.
4. Confirmar matriz de permissoes.
5. Confirmar auditoria do bootstrap.
