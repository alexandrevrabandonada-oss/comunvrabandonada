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
- [ ] `npm run smoke:attachments-queue` passa
- [ ] `npm run smoke:attachments-ops` passa
- [ ] `npm run smoke:official-protocol` passa
- [ ] `npm run smoke:official-protocols-admin` passa
- [ ] `npm run smoke:official-protocols-metrics` passa
- [ ] `npm run smoke:pauta-spaces` passa
- [ ] `npm run smoke:pauta-contribution-safety` passa
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
- [ ] abrir `/comun/admin/anexos`
- [ ] confirmar filtros pending, needs_redaction, rejected, public_ready e approved_private
- [ ] confirmar que a fila nao mostra `storage_path` completo nem signed URL fora do admin
- [ ] abrir `/comun/protocolo-popular`
- [ ] abrir `/comun/acompanhar/<protocolo>/ouvidoria`
- [ ] confirmar que texto de Ouvidoria nao contem `raw_text`, contato privado ou notas internas
- [ ] informar protocolo oficial fake e confirmar acompanhamento publico
- [ ] registrar resposta fake e confirmar que `response_text` nao aparece publicamente
- [ ] abrir `/comun/admin/protocolos-oficiais`
- [ ] confirmar filtros de status, comunidade, pauta, canal, numero, resposta e vencidos
- [ ] confirmar metricas de tempo medio, acumulados por pauta/comunidade/canal e possiveis dossies
- [ ] registrar resumo publico seguro e confirmar que aparece no acompanhamento
- [ ] marcar resolvido/nao resolvido sem expor resposta completa
- [ ] sair e confirmar que admin volta a exigir login
- [ ] abrir `/comun/pautas`
- [ ] criar pauta social em `/comun/admin/pautas`
- [ ] enviar contribuicao publica e confirmar que fica pendente
- [ ] confirmar desafio leve e limite de envio excessivo em contribuicoes de pauta
- [ ] abrir `/comun/admin/pautas/contribuicoes` e revisar fila global
- [ ] aprovar contribuicao e confirmar que aparece publicamente
- [ ] criar tarefa e confirmar que aparece publicamente sem contato privado
- [ ] testar no celular via 4G/5G
- [ ] testar link vindo do Instagram/WhatsApp
