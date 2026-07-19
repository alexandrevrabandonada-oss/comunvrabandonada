# Estado — Sprint 34.2: primeira participação local

Data: 19/07/2026. Estado: **implementação local verificada; revisão humana e promoção pendentes**.

## Entrega

- cadastro real via Supabase Auth local, sessão comunitária e perfil privado;
- retorno interno seguro preservado no cadastro e onboarding;
- onboarding de calçadas reduzido a território amplo, com bairro opcional;
- vertical existente de calçadas reutilizada, agora com vínculo privado ao membro;
- fluxo Foto → Local → Problema → Revisar, JPEG privado no storage local e mapa textual;
- rascunho não sensível, removível e versionado;
- confirmação explicativa, caixa de entrada, Minha área e retorno à pauta;
- resultado e memória permanecem visíveis na pauta fixture, sem promessa automática.

## Qualidade

- lint e typecheck: aprovados;
- unitários: 210/210;
- build Next.js 16.2.10: aprovado;
- E2E principal: 10/10, cinco viewports, sem skip;
- Axe nas superfícies críticas do cenário: zero serious/critical;
- central experience: 55/55;
- sidewalk pilot: 75/75;
- auth local, pauta miniapp, no-leak HTTP e cleanup: aprovados.

O cenário complementar de retorno hostil também passa nos cinco viewports. Estados de e-mail já usado, senha inválida, foto removida, sessão expirada e falhas de upload/envio possuem contratos de produto, mas não receberam cenários E2E dedicados nesta passagem; permanecem risco residual antes de promoção.

## Declarações

- Piloto público: **NÃO ABERTO**.
- Integração principal: **NÃO EXECUTADA**.
- Push: **NÃO EXECUTADO**.
- Deploy: **NÃO EXECUTADO**.
- Supabase remoto: **NÃO ALTERADO**.
- R2 real: **NÃO UTILIZADO**.
- Serviços externos: **NÃO UTILIZADOS**.
- Dados reais: **NÃO UTILIZADOS**.
- Custo externo: **R$ 0**.
