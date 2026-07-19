# Estado — Sprint 35: PWA app-like local

Data: 19/07/2026. Branch: `codex/comun-pwa-app-like-local`. Base: `9e275fd`.

## Entrega

- manifest válido com identidade, escopo `/comun/`, standalone, ícones e atalhos;
- shell persistente com safe areas, estado de conexão e reduced motion;
- instalação contextual não bloqueante e recusa temporária;
- service worker versionado, allowlist pública e fallback COMUN;
- exclusão explícita de admin, áreas pessoais, auth, contribuição, uploads e APIs;
- atualização controlada sem recarga silenciosa;
- Web Share com fallback acessível;
- rascunho de calçadas v2 validado, migrável e sem dados sensíveis;
- envio bloqueado offline, sem falsa confirmação e sem fila sensível;
- política de cache/sincronização documentada.

## Evidências

- lint, tipos e build aprovados;
- 213/213 unitários;
- PWA 20/20 em cinco viewports, com Axe zero serious/critical;
- central 55/55;
- navegador integrado: DOM real, fallback, retorno e console aprovados;
- service worker 3.030 bytes, seis entradas de shell e dois caches.

## Bloqueios e decisões

A repetição da regressão de calçadas excedeu 120 s e não gerou resultado; os 75/75 da base 34.2 não são promovidos como nova execução. Falhas autenticadas residuais não receberam uma matriz dedicada completa nesta passagem. Gate humano permanece pendente e não foi preenchido automaticamente.

Decisão técnica: **APROVADA PARA GATE HUMANO LOCAL COM RISCOS DOCUMENTADOS**. Decisão humana: **PENDENTE**. Decisão remota: **NÃO AUTORIZADA / NÃO EXECUTADA**.

Piloto público: **NÃO ABERTO**. Integração principal: **NÃO EXECUTADA**. Push: **NÃO EXECUTADO**. Deploy: **NÃO EXECUTADO**. Supabase remoto: **NÃO ALTERADO**. R2 real: **NÃO UTILIZADO**. Serviços externos: **NÃO UTILIZADOS**. Dados reais: **NÃO UTILIZADOS**. Custo externo: **R$ 0**.
