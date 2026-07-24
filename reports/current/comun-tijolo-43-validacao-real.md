# Tijolo 43 — correção e validação real

Atualizado em 24 de julho de 2026.

## Decisão

`COMUN_CALCADAS_OPERATIONAL_REQUIRES_PROMOTION`

O lote corrige a diferença entre o contrato declarado e a implementação local.
O texto original passou a `private_notes`; `public_summary` começa nulo e só é
preenchido por revisão humana antes da publicação. A migration local
`20260724233256_comun_sidewalk_operational_hardening.sql` é necessária para
tornar esse contrato explícito, registrar complemento privado, recuperar locks
e preservar decisões de duplicidade. Seu manifesto está em
`supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json`.

## Evidência local esperada

- upload limitado antes da URL assinada (hora, dia, tickets abertos e bytes);
- lock de confirmação datado, com retomada após cinco minutos;
- confirmação repetida retorna o mesmo registro após concluída;
- falha de validação é final; falha transitória é recuperável;
- compensação remove registro, item, asset e objeto privado parciais;
- publicação exige resumo sanitizado e mantém o registro interno em falha;
- pedido de complemento contém campo, orientação, prazo e URL acionável;
- duplicidade é apenas sugerida e decidida por editor autorizado;
- mapa manual tem foco, setas e confirmação por Enter/Espaço.

## Limites honestos

Não houve migration remota, escrita no Supabase remoto, merge, domínio,
deploy manual, abertura de piloto ou preenchimento do gate humano. O gate
humano segue 0/3. A promoção controlada da migration e a validação remota
continuam necessárias antes de qualquer declaração de disponibilidade pública.
