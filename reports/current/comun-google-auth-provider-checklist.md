# 48.0M-AUTH1 — checklist único de configuração manual

Este checklist só deve ser executado em Preview HTTPS autorizado. Nenhum valor deve ser commitado.

## Google Auth Platform

- [ ] projeto específico do COMUN selecionado;
- [ ] branding revisado;
- [ ] audiência definida;
- [ ] somente `openid`, `userinfo.email` e `userinfo.profile` configurados;
- [ ] OAuth Client do tipo Web criado;
- [ ] origem HTTPS do Preview adicionada;
- [ ] Client ID e Client Secret copiados somente para o cofre/secret manager.

## Supabase Auth

- [ ] provider Google habilitado no projeto correto;
- [ ] Client ID e Client Secret inseridos apenas no provider server-side;
- [ ] callback do Supabase (`/auth/v1/callback`) registrado no Google;
- [ ] `https://<preview-allowlisted>/comun/auth/callback` registrado nas Redirect URLs;
- [ ] Site URL conferida;
- [ ] e-mail/senha preservado.

## Vercel

- [ ] segredos configurados somente em Preview;
- [ ] `COMUN_GOOGLE_AUTH_ENABLED` permanece desligada em Production;
- [ ] Preview HTTPS validado antes de qualquer decisão de ativação;
- [ ] nenhum Client Secret exposto como `NEXT_PUBLIC_*`;
- [ ] redeploy somente após a configuração.

O código atual não possui credenciais, não consulta o provider real e não emite `COMUN_AUTH_GOOGLE_ENABLED`.
