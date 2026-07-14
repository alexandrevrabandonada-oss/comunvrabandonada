# Plano manual de release sem execucao

Este plano nao deve ser executado neste tijolo. Ele existe para decisao humana de release.

## Pre-checks

1. Confirmar `RC_LOCAL_PASS`.
2. Confirmar commit final aprovado.
3. Confirmar backup do banco remoto.
4. Confirmar admin real no Supabase Auth.
5. Confirmar variaveis Vercel/Supabase.
6. Confirmar janela de release e responsavel humano.

## Aplicacao de migrations

1. Revisar `release_migration_inventory.md`.
2. Confirmar backup concluido.
3. Aplicar migrations remotas somente com autorizacao explicita.
4. Rodar auditoria RLS remota somente se autorizada.

## Deploy Vercel

1. Executar deploy apenas em tijolo/release autorizado.
2. Nao reaproveitar este tijolo para deploy.
3. Registrar URL final e commit.

## Validacao pos-deploy

1. Configurar `ALLOW_PRODUCTION_CHECKS=1` apenas durante validacao.
2. Configurar `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app`.
3. Rodar smokes de producao explicitamente autorizados.
4. Remover/desativar variavel de permissao apos validacao.

## Rollback operacional

1. Pausar divulgacao publica.
2. Reverter deploy Vercel para versao anterior.
3. Se migration exigir rollback, executar plano SQL revisado manualmente.
4. Despublicar snapshots problemáticos, se necessario.
5. Registrar incidente e decisao.
