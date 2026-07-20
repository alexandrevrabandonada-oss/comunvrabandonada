# Política local de cache e sincronização do COMUN

Data: 19/07/2026. Versão: Sprint 35.

## Limite de confiança

O service worker usa allowlist. Só o shell e superfícies públicas aprovadas podem ser armazenados. Admin, Minha área, caixa de entrada, conta, autenticação, onboarding, contribuição, uploads, APIs, respostas com `Set-Cookie` e respostas `private` nunca entram no cache PWA.

O cache público serve para leitura resiliente e pode estar desatualizado. Protocolos, resultados recentes, estados pessoais e decisões operacionais exigem conexão para confirmação. A interface nunca chama uma ação local de “enviada”.

## Rascunhos

O armazenamento local aceita apenas envelope `comun:drafts:v2`: identificador local, jornada, etapa, categoria, território amplo, comunidade, pauta, preferência de mapa manual, horário e versão. Imagem, áudio, descrição, contato, coordenada precisa, token, cookie, ID privado e URL assinada são proibidos. Formatos inválidos são ignorados; o formato legado de calçadas migra somente os campos permitidos.

Fotos permanecem apenas na sessão do seletor de arquivos. Depois de recarregar, a pessoa precisa escolher novamente. Contribuições, fotos, protocolos e mensagens não entram em fila local e sempre exigem resposta do servidor.

## Retomada, atualização e logout

A última rota guardada precisa ser interna e segura. Atualizações aguardam confirmação da pessoa e não recarregam silenciosamente. Caches antigos são removidos na ativação. O logout encerra a sessão no servidor; a PWA não cria cache privado. Rascunhos não sensíveis permanecem até descarte explícito ou confirmação do envio.

Não existe background sync sensível, notificação push, analytics remoto ou serviço externo nesta implementação.
