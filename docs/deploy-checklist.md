# Deploy Checklist

## Antes do deploy

- [ ] Supabase migration aplicada
- [ ] Seeds presentes
- [ ] `.env.local` local funcionando
- [ ] `npm run verify` passa
- [ ] `npm run smoke:comun` passa
- [ ] `npm run smoke:admin-auth` passa
- [ ] `npm run smoke:no-leak-http -- --path /comun/pautas/<slug> --required "<public_text>" --forbidden "<segredo-ficticio>"` passa
- [ ] `npm run smoke:protocol-follow` passa
- [ ] `npm run smoke:protocol-rate-limit` passa
- [ ] `npm run storage:setup` confirma bucket privado
- [ ] `npm run smoke:quick-report` passa
- [ ] `npm run smoke:attachment-curation` passa
- [ ] GitHub sem segredos
- [ ] Vercel conectado ao GitHub

## Na Vercel

- [ ] importar projeto do GitHub
- [ ] configurar env vars
- [ ] configurar `COMUN_LOOKUP_HASH_SALT` com valor sensivel e aleatorio
- [ ] confirmar bucket privado `comun-report-attachments`
- [ ] confirmar bucket privado `comun-public-safe-attachments`
- [ ] criar usuario admin no Supabase Auth
- [ ] rodar `npm run bootstrap:admin -- --email email@exemplo.com`
- [ ] confirmar framework Next.js
- [ ] build command padrao
- [ ] deploy

## Depois do deploy

- [ ] abrir `/comun`
- [ ] abrir `/comun/relatar`
- [ ] enviar relato real de teste
- [ ] abrir `/comun/admin`
- [ ] confirmar redirect para `/comun/admin/login` sem sessao
- [ ] fazer login com usuario da allowlist
- [ ] revisar relato
- [ ] criar `public_text` sanitizado
- [ ] publicar
- [ ] abrir pagina publica da pauta
- [ ] confirmar que `public_text` aparece
- [ ] confirmar que `raw_text`, `private_contact` e `internal_notes` nao aparecem
- [ ] rodar smoke HTTP de nao vazamento para a pauta publicada
- [ ] confirmar evento em `/comun/admin/auditoria`
- [ ] conferir indicadores em `/comun/admin/observabilidade`
- [ ] enviar relato rapido com foto/localizacao em celular real
- [ ] confirmar que foto e localizacao aparecem apenas no admin
- [ ] marcar anexo como precisa de blur/redacao
- [ ] subir versao publica segura e confirmar que original nao aparece publicamente
- [ ] sair e confirmar que admin volta a exigir login
- [ ] testar no celular via 4G/5G
- [ ] testar link vindo do Instagram/WhatsApp
