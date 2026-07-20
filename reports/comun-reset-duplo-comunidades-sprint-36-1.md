# Reset duplo — Comunidades Sprint 36.1

Data: 19/07/2026.

## Prova

1. Primeiro `supabase db reset --local`: migration e seed aplicados; lint do banco aprovado.
2. Jornada persistente executada em cinco viewports: 35/35.
3. Segundo `supabase db reset --local`: migration e seed reaplicados do zero.
4. Após o segundo reset: 219/219 unitários, `RLS_MATRIX_OK`, `COMMUNITY_PERSISTENCE_OK` e novamente 35/35 E2E.

O teste negativo confirmou que usuário não lê vínculo alheio, anônimo não lê vínculo, preferências não promovem membership, papel não vaza a follower, lista de grupo permanece privada e suspensão impede retomada.

## Declarações obrigatórias

Piloto **não aberto**; integração principal, push e deploy **não executados**; Supabase remoto **inalterado**; R2 real, serviços externos e dados reais **não utilizados**; custo externo **R$ 0**.
