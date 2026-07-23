# Sprint 39 — revisão de privacidade geográfica

Migration local aplicada do zero e `supabase db lint --local --level warning` sem erros. A geometria original, precisão, vínculo do usuário e foto permanecem em campos/tabelas internas. A submissão anônima usa o papel `authenticated`, ownership por `auth.uid()` e escrita server-side; usuários anônimos não recebem membership/papel comunitário.

Limites: 5 envios/hora e 30/dia por conta no backend. A fila administrativa passou a exibir precisão, inferências e risco geográfico e permite publicação exata, aproximada, sem foto, pedido de correção ou rejeição.

A matriz RLS confirmou tabelas internas sem acesso direto e projeções públicas sanitizadas. O smoke HTTP não executou na primeira tentativa porque o servidor não estava ativo; a validação renderizada posterior não encontrou coordenada privada, precisão, chaves de Storage ou IDs privados no HTML público.

Gate de privacidade local: **APROVADO PARA O ESCOPO TÉCNICO**. A verificação EXIF é automática; upload direto privado usa autorização de objeto específico, ownership e expiração; confirmação e cleanup são server-side. A revisão física e humana permanece fechada.
