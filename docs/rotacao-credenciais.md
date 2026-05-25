# Rotacao de Credenciais

Use este checklist sempre que alguma credencial sensivel tiver sido compartilhada fora do cofre operacional esperado.

1. Rotacionar o Supabase access token usado no CLI, se ele foi compartilhado.
2. Rotacionar `SUPABASE_SERVICE_ROLE_KEY` se ela foi exposta.
3. Rotacionar a senha do banco se ela foi compartilhada.
4. Atualizar `.env.local` com os novos valores.
5. Atualizar as variaveis da Vercel.
6. Fazer novo deploy.
7. Rodar:

```bash
npm run verify
npm run smoke:comun
npm run smoke:admin-auth
```

8. Confirmar que o app segue funcionando.
9. Apagar qualquer registro local inseguro que contenha segredo.
10. Nunca commitar segredos.
