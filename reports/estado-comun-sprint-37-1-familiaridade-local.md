# Estado do COMUN — Sprint 37.1

Data: 19/07/2026.

## Resultado

A candidata local recebeu acabamento de familiaridade sem abertura de novos domínios: navegação principal com uma família Lucide, faixa única de demonstração, hierarquia menos repetitiva, mapa com alternância mapa/lista, Inbox e Minha Área mais reconhecíveis e confirmação com estado e próxima ação explícitos.

A falha production-like da Sprint 37 foi corrigida. A contribuição autenticada agora preserva erros recuperáveis; o ensaio local usa explicitamente `MEDIA_STORAGE_PROVIDER=supabase-local`; credenciais inválidas, conta existente e sessão expirada têm mensagens acionáveis.

## Evidência

- build Next.js 16.2.10: aprovado;
- lint e typecheck: aprovados;
- unitários: 227/227 em 38 arquivos;
- jornada production-like: 10/10 cenários autenticados/auth aprovados e, após correção de expectativa textual do teste, 5/5 cenários visitantes aprovados, em 360, 390, 768, 1024 e 1366 px;
- regressões: comunidades 30/35 + 5/5 afetados; PWA 15/20 + 5/5 afetados; calçadas 75/75; operação editorial 15/15;
- autenticação local e limpeza de fixtures: aprovadas;
- inspeção no navegador integrado: página com identidade, interação de abas e ausência de erros de console;
- gate humano: 0/3, não executado.

## Decisão

Prontidão técnica local: **APROVADA**. Promoção/piloto: **NO-GO**, exclusivamente porque o gate humano obrigatório segue pendente.

Atualização Sprint 37.2: a candidata foi congelada sobre esta base e o harness/formulários do gate foram preparados. As sessões continuam em 0/3; não houve correção de produto nem mudança da decisão humana.

Piloto público **NÃO ABERTO**; integração principal **NÃO EXECUTADA**; push **NÃO EXECUTADO**; deploy **NÃO EXECUTADO**; Supabase remoto **NÃO ALTERADO**; R2 real **NÃO UTILIZADO**; dados reais **NÃO UTILIZADOS**; custo externo **R$ 0**.
