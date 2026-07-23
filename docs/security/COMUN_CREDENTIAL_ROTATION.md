# Rotação segura de credenciais do COMUN

Este runbook não contém valores. A rotação não foi executada no Tijolo 41.

## Preparação

1. Defina janela, responsável, rollback e deployment saudável de referência.
2. Gere uma nova senha do banco no Supabase.
3. Atualize `SUPABASE_DB_PASSWORD` e, quando aplicável, `SUPABASE_DB_URL`.
4. Rotacione a `service_role` quando o mecanismo da plataforma permitir.
5. Atualize os secrets do GitHub Actions sem exibir valores.
6. Atualize Vercel Preview e Production, mantendo os escopos corretos.

## Promoção e verificação

7. Inicie um novo deployment depois que todos os ambientes estiverem coerentes.
8. Execute o verificador abaixo para Auth público, Auth administrativo, banco e
   Storage.
9. Faça smoke das rotas públicas e das operações server-side autorizadas.
10. Invalide as credenciais antigas somente após a verificação verde.
11. Registre apenas data, responsável, ambientes e resultado — nunca valores.

```bash
node scripts/security/verify-remote-credentials.mjs
```

Saída verde esperada, e somente ela:

```text
AUTH_PUBLIC_OK
AUTH_SERVICE_OK
DATABASE_OK
STORAGE_OK
CREDENTIAL_ROTATION_VERIFIED
```

Em falha, o script encerra sem imprimir tokens. O rollback restaura os secrets
anteriores nos provedores e promove o deployment saudável registrado.

