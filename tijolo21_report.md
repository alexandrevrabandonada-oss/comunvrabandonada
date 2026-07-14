# Tijolo 21 - Notificacoes internas e digest da fila de revisoes

## Ambiente

- Ambiente usado: local para app e smokes HTTP.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Envio externo executado: nao.

## Implementado

- Migration `supabase/migrations/20260708030426_admin_notifications.sql`.
- Tabela interna `comun_admin_notifications`.
- Helper `lib/admin-notifications.ts`.
- Pagina admin `/comun/admin/notificacoes`.
- Badge no `AdminShell` com contadores de nao lidas, vencidas e urgentes.
- Digest interno em `/comun/admin/dossies/revisoes` com:
  - vencidos;
  - vencem hoje;
  - aguardando factual;
  - aguardando editorial;
  - prontos para publicar;
  - bloqueados por mesmo revisor;
  - ajustes solicitados.
- Geracao interna de notificacoes para atribuicoes, prazo, prioridade alta/urgente, vencido, ajustes, bloqueio por mesmo revisor e pronto para publicar.
- Actions para marcar notificacao como lida e arquivar.
- Auditoria:
  - `admin_notification_created`;
  - `admin_notification_read`;
  - `admin_notification_archived`;
  - `review_digest_viewed`.

## Migration

Dry-run confirmou apenas:

```text
20260708030426_admin_notifications.sql
```

Migration aplicada com `npx supabase db push --linked --yes`.

Schema confirmado:

```text
NOTIFICATIONS_SCHEMA_OK
```

## Status final

Aceito localmente, sem deploy, sem smoke contra producao e sem envio externo.
