# Tijolo 48.0K — WhatsApp STMU sem submissão

## Resultado técnico

`COMUN_STMU_48_0K_DB_GREEN` no laboratório descartável. O adaptador `vr-stmu-whatsapp-complaint-v1` usa a categoria canônica `public_transport`, pacote compartilhado de forwarding e Carteira existente.

O fluxo é: observação de Ônibus → Relata → Carteira → pacote revisável → copiar mensagem → abrir `https://wa.me/5524992958558` por gesto explícito. Não há prefill, query string, automação, cliente WhatsApp, envio ou protocolo confirmado.

## Verificações

- idempotência de pacote, atualização de requisitos, revisão, abertura e declaração sintética passaram;
- expectativa documental de 72 horas só inicia após declaração da pessoa e permanece não confirmada no WhatsApp;
- RLS completa verde, grants explícitos e RPCs service-role-only;
- cloak local para GET/POST/PATCH/DELETE/PUT: `404`, sem `405`;
- typecheck, lint, build, surfaces e teste focal do adaptador verdes;
- Production e Supabase remoto não foram consultados nem alterados.

Resultado do tijolo: `COMUN_STMU_48_0K_MERGED_DORMANT_WHATSAPP_MENU_OBSERVED_COMPLAINT_FLOW_PENDING_REMOTE_UNCHANGED` fica condicionado à PR/CI/Preview e ao smoke pós-merge; antes disso este branch é candidato local.
