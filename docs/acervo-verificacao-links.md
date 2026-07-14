# Verificação de links musicais

O verificador usa HTTPS, HEAD, timeout curto, redirects manuais limitados, allowlist e resolução DNS. Localhost, IPs privados, link-local e redirects para host não autorizado são bloqueados. Nenhum corpo, mídia ou JavaScript é baixado ou executado.

Links oficiais são revistos a cada 30 dias pela fila `music_external_link_check`; primeira falha agenda retry em 24 horas e três falhas podem marcar `broken`. Nunca há exclusão automática. A retenção usa `npm run prune:music-link-checks`, dry-run por padrão, e exige `MUSIC_LINK_CHECK_PRUNE_CONFIRM=true` para excluir checks antigos não essenciais.
