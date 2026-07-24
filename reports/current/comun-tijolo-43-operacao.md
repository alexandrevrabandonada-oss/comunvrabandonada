# Tijolo 43 — operação do Mapa das Calçadas

Atualizado em 24 de julho de 2026.

## Decisão

`COMUN_CALCADAS_OPERATIONAL_READY`

O ciclo reutiliza a estrutura existente, sem migration e sem escrita remota:

`REGISTRO → TRIAGEM → VERIFICAÇÃO → PUBLICAÇÃO SANITIZADA → AGRUPAMENTO → PRIORIDADE → PROPOSTA → AÇÃO/PROTOCOLO → RESPOSTA → RESULTADO → MEMÓRIA`

## Operação

- captura: câmera ou arquivo, GPS ou ponto manual aproximado, condição,
  categoria, impacto de acessibilidade, consentimento e revisão final;
- upload: original privado, autorização curta, confirmação server-side
  idempotente e ausência de registro público antes da moderação;
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
- nenhuma migration;
- nenhum Supabase remoto alterado;
- nenhuma publicação automática.
