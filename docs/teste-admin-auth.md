# Teste Admin Auth

1. Criar usuario admin no Supabase Auth.
2. Rodar bootstrap:

```bash
npm run bootstrap:admin -- --email email@exemplo.com
```

3. Abrir `/comun/admin` sem login.
4. Confirmar redirecionamento para `/comun/admin/login`.
5. Fazer login com e-mail e senha do Supabase Auth.
6. Confirmar acesso ao admin.
7. Abrir relato interno.
8. Salvar versao sanitizada.
9. Publicar.
10. Confirmar registro em `/comun/admin/auditoria`.
11. Sair.
12. Confirmar que admin volta a exigir login.
13. Confirmar que `/comun/relatar` segue publico.
