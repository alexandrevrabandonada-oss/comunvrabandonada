# Estado — Sprint 34.1: jornada autenticada local

Data: 19/07/2026. Estado: **implementação local verificada, não promovida**.

## Entregas

- retorno seguro e preservação de contexto entre exploração, login, onboarding e destino;
- onboarding progressivo de cinco passos, opcional e retomável, sem persistir conteúdo sensível;
- home autenticada orientada ao que requer atenção e com estados vazios úteis;
- “Minha área” organizada por prioridade, sem inventar ou duplicar dados ausentes;
- comunidades apresentadas como casas organizativas persistentes;
- página de comunidade reordenada em propósito, próxima ação, pautas, atividade, resultados e memória;
- participação contextual com foco acessível e retorno à origem;
- documentação de jornada, fricção, revisão visual e release readiness.

## Evidências locais

- lint e typecheck: aprovados;
- build Next.js 16.2.10: aprovado;
- unitários: 210/210 aprovados; testes focados de retorno/status: 11/11;
- E2E Sprint 34.1: 21 aprovados e 4 saltados intencionalmente (fluxo autenticado completo concentrado em 390 px);
- regressão central: 55/55 aprovada;
- piloto de calçadas: 75/75 aprovado em cinco viewports, com Axe e fixtures limpas;
- smoke de autenticação local: aprovado;
- capturas públicas: seis superfícies × cinco viewports; capturas autenticadas: 390 × 844.

O aviso de hidratação visto durante a regressão é causado pela injeção de `caret-color` do Playwright nos controles capturados e não produziu falha funcional.

## Declarações obrigatórias

- Piloto público: **NÃO ABERTO**.
- Integração principal: **NÃO EXECUTADA**.
- Push: **NÃO**.
- Deploy: **NÃO**.
- Supabase remoto: **NÃO**.
- R2 real: **NÃO**.
- Serviços externos e dados reais: **NÃO**.
- Custo externo: **R$ 0**.

## Pendências

- executar gate humano de navegação e conteúdo antes de qualquer promoção;
- validar cadastro completo e contribuição autenticada de ponta a ponta em uma candidata de integração;
- ampliar a matriz autenticada para os cinco viewports;
- tratar como melhoria posterior a folga inferior do onboarding móvel.

## Atualização Sprint 34.2

Cadastro completo, onboarding mínimo contextual, JPEG/storage local, contribuição autenticada, confirmação, Minha área e retorno à pauta foram comprovados em cinco viewports. A revisão humana continua pendente e o piloto permanece não aberto. Consulte `estado-comun-sprint-34-2-primeira-participacao-local.md`.
