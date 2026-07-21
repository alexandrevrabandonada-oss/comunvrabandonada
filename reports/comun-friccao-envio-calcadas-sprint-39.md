# Sprint 39 — fricção do envio

Fluxo atual: **foto → GPS/ponto → condição → enviar**, em uma única tela depois da foto. Nome, bairro, rua, descrição e cadastro prévio não são obrigatórios. Problemas e descrição são opcionais.

Validação integrada no navegador local:

- CTA da câmera em uma ação: passou;
- galeria como fallback: passou com fixture sem pessoa;
- GPS negado + ponto manual: passou manualmente no navegador integrado;
- condição em uma ação: passou;
- envio sem digitação: passou;
- confirmação `under_review`: passou;
- cinco viewports do mapa/regressão e captura rápida: rodada histórica 40/40; rodada da Sprint 39.1 validou 45 cenários, corrigiu grant e comprovou separadamente o upload direto móvel.

O upload direto e a confirmação em duas fases estão fechados localmente. A rodada integral final permanece obrigatória antes de qualquer uso remoto.
