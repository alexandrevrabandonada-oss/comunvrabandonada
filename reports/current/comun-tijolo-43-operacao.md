# Tijolo 43 — operação do Mapa das Calçadas

Atualizado em 25 de julho de 2026.

## Decisão

`COMUN_CALCADAS_FAST_PATCH_REQUIRED`

O ciclo local usa texto original privado, resumo público produzido em revisão
humana, confirmação recuperável e sugestão assistida de duplicidade:

`REGISTRO → TRIAGEM → VERIFICAÇÃO → PUBLICAÇÃO SANITIZADA → AGRUPAMENTO → PRIORIDADE → PROPOSTA → AÇÃO/PROTOCOLO → RESPOSTA → RESULTADO → MEMÓRIA`

## Operação

- captura: câmera ou arquivo, GPS ou ponto manual aproximado, condição,
  categoria, impacto de acessibilidade, consentimento e revisão final;
- upload: original privado, rate limit antes da URL assinada, lock com prazo,
  confirmação server-side idempotente e compensação de artefatos parciais;
- moderação: aprovação aproximada ou sem imagem, rejeição, complemento,
  suspensão e decisão editorial;
- verificação: observações comunitárias preservam estado, evidência e data;
- duplicidades: pontuação por sinais apenas sugere `POSSIBLE_DUPLICATE`; a
  decisão humana continua `MERGED`, `RELATED` ou `DISTINCT`;
- continuidade: Minha Participação mostra estado, última mudança, próxima ação
  e link; a Caixa permanece o canal acionável;
- desdobramentos: prioridades, propostas, mobilização, protocolo, resposta,
  resultado e memória usam as estruturas já existentes.

## Limites

- gate humano: 0/3;
- piloto público: fechado;
- migration local forward-only pendente de promoção:
  `20260724233256_comun_sidewalk_operational_hardening.sql`;
- reconciliação estrutural local concluída em duas rodadas equivalentes; o
  teste do runner passou 18/18 duas vezes com porta Docker efêmera. A execução
  final idempotente pelo runner falhou no transporte Docker do CI Ubuntu antes
  do POST; o PRE real foi confirmado e nenhuma migration remota foi aplicada;
- nenhum Supabase remoto alterado;
- nenhuma publicação automática.

## Checkpoint T43.1

O runner de promoção local deixa de depender de loopback publicado para
conversar entre containers. A conexão interna usa uma rede Docker nomeada e
alias de banco, mantendo URL, credenciais e dados somente no ambiente local.
O teste do transporte passou 18/18 duas vezes; os checks de runtime/RLS/DB
lint desta rodada ficaram bloqueados pela ausência da stack Supabase local e
não autorizam promoção. FAST e rehearsal Ubuntu seguem obrigatórios.
Adendo: FAST do SHA 5503e02 aprovou a stack Ubuntu e a rota db:5432; o rehearsal expôs apenas uma serialização divergente do fingerprint, já corrigida localmente. FULL continua proibido até a nova execução remota.
