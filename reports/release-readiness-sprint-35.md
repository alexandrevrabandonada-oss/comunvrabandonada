# Release readiness — Sprint 35

## Decisão

**Aprovada tecnicamente para gate humano local; não pronta para integração, deploy ou piloto.**

| Gate | Resultado |
| --- | --- |
| lint / typecheck / build | aprovados |
| unitários | 213/213 |
| E2E PWA | 20/20 em cinco viewports |
| Axe PWA | zero serious/critical |
| regressão central | 55/55 |
| regressão calçadas | repetição inconclusiva por timeout de 120 s; base 34.2 tinha 75/75 |
| navegador integrado | página, fallback, interação e console aprovados; screenshot não suportado |
| performance | registrada localmente; TTI/Lighthouse não medidos |
| gate humano | pendente e separado |

Riscos residuais: a suíte PWA cobre os contratos principais, mas não automatiza ainda todos os 20 cenários funcionais individualmente (falhas reais de upload/sessão/troca de usuário exigem infraestrutura local autenticada); ícones são SVG, não PNG nativo; repetição completa de calçadas não concluiu nesta janela.

Piloto público **NÃO ABERTO**; integração principal **NÃO EXECUTADA**; push/deploy **NÃO EXECUTADOS**; Supabase remoto **NÃO ALTERADO**; R2 real **NÃO UTILIZADO**; serviços externos/dados reais **NÃO UTILIZADOS**; custo **R$ 0**.
