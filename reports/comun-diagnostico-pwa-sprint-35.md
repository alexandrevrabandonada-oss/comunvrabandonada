# Diagnóstico PWA — Sprint 35

Data: 19/07/2026.

| Capacidade | Antes | Implementação Sprint 35 |
| --- | --- | --- |
| manifest / instalação | ausente | funcional: identidade, escopo, standalone, cores, ícones, maskable e quatro atalhos |
| ícones | ausentes | funcional em SVG 192/512/maskable; PNG nativo permanece refinamento futuro |
| service worker / registro | ausente | funcional e registrado somente sob `/comun/` |
| cache | ausente | funcional com allowlist pública e bloqueio privado explícito |
| offline fallback | ausente | funcional, contextual e sem falsa confirmação |
| atualização | ausente | funcional, visível e acionada pela pessoa |
| standalone / safe areas | parcial | funcional por media query, viewport dinâmico e `env(safe-area-inset-*)` |
| instalação contextual | ausente | funcional após valor percebido e com recusa por sete dias |
| conectividade | ausente | funcional com eventos do navegador e falha de registro; requests sensíveis continuam online-only |
| rascunhos | parcial | v2 versionado, validado e sem campos sensíveis |
| deep links | parcial | rotas internas preservadas pelo App Router; auth mantém `returnTo` seguro |
| compartilhamento | ausente | Web Share com fallback de cópia acessível |
| logout | parcial | sessão encerrada; nenhum cache privado é criado |

## Limites conscientes

- `navigator.onLine` não é tratado como prova de envio: mutações aguardam resposta do servidor e o formulário bloqueia quando offline.
- Não foi criada fila para uploads, contribuição, protocolos ou mensagens.
- O service worker não intercepta POST e não armazena APIs, `Set-Cookie` ou `private`.
- Conteúdo público em cache pode estar desatualizado; o fallback comunica que estados pessoais e operacionais exigem conexão.
