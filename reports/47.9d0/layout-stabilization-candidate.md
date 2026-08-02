# TIJOLO 47.9D0 — candidata de estabilização do layout real

- Base: `0b728d2807779484cc51dab2bc67bb69a443fae5`
- Branch: `codex/tijolo-47-9d0-layout-real-stabilization`
- Resultado parcial pretendido após merge e Production: `COMUN_APP_V2_LAYOUT_REAL_STABILIZED`
- Experiência padrão nesta PR: legado; App V2 continua opt-in por `?experiencia=app-v2`.

## Correções

- contrato semântico claro/escuro para os sete shells e ponte auditável das utilidades legadas;
- Participar compacto, agrupado por intenção e sem mutation;
- Entrar compacto, com `returnTo`, autocomplete, password manager e foco no erro preservados;
- reconexão anunciada somente depois de offline confirmado e verificação real de conectividade;
- status de conexão em overlay fora do fluxo;
- altura efetiva da navegação inferior medida e compartilhada com padding, foco e scroll;
- ritmo específico para mobile e landscape curto.

## Evidência automatizada da candidata

- matriz: 189 páginas, sete shells, zero rota desconhecida, zero `legacy_rendered`, zero P0/P1;
- dívida P2/P3: 93, sem alteração estrutural;
- contraste computado: mobile e desktop em representantes públicos, roots, nested, auth, institucionais e imersivos;
- administração autenticada: 35 cenários em cinco viewports, incluindo editorial, Central Operacional e sistêmica;
- first viewport: 12 cenários em 320 px, Android-alvo, telas maiores e landscape;
- mobile/PWA: cinco cenários de navegação, safe area, reconexão e Axe;
- zoom/reflow: três cenários com fonte a 200%;
- jornadas: 35 E2E e cinco passadas a11y;
- App Shell V2: 35 E2E e cinco passadas a11y;
- grafo cívico: 40 E2E;
- qualidade: 27 cenários a11y, 30 PWA e nove de performance;
- no-leak local verde após a stack Supabase descartável ficar saudável;
- `typecheck`, `lint` e build de produção verdes.

## Estados preservados

- 47.9A permanece aguardando ensaio humano ampliado;
- 47.9B permanece bloqueado pelo provider;
- 47.9C permanece aguardando aparelhos e tecnologia assistiva reais;
- `security_resilience` permanece bloqueado por redundância durável;
- `miniapps` e `archive_radio_art` permanecem condicionados a evidência real;
- `launch_publicly` permanece fechado.
