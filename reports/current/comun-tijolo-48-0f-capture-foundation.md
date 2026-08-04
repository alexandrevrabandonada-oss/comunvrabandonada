# Tijolo 48.0F — fundação de captura rápida

## Experiência

“Vi um problema” substitui a escolha burocrática inicial por conteúdo (texto ou fotografia), localização opcional e guardar. A classificação é determinística e a pergunta adaptativa só aparece quando muda materialmente o encaminhamento. Emergência orienta afastamento sem ligação automática. O formulário detalhado reaproveita `sessionStorage` do rascunho sem repetir texto, foto ou local.

## Contratos

- Flag cumulativa: `COMUN_QUICK_CAPTURE_V2=enabled`; desligada mantém `/comun/relatar` exatamente no legado.
- Protocolo: `lib/comun-protocol.ts` reconhece legado, Relata e aliases sem conversão silenciosa.
- Relata novo é a fonte da verdade; `private.comun_relata_legacy_projections` é apenas compatibilidade.
- Fotografia usa o pipeline privado validado do Relata; não há URL pública, publicação, IA, OCR ou envio.
- Métricas locais registram somente evento, contagem, faixa de duração, categoria e código sanitizado.

## Evidência automatizada

- 475/475 testes unitários;
- 10/10 E2E da captura em 320 px, 390 px, landscape, 768 px e PWA; Axe sem violações sérias/críticas;
- typecheck, lint e build verdes;
- surfaces: 192 páginas, sete shells, zero desconhecida, zero `legacy_rendered`, zero P0/P1;
- DB rehearsal, RLS e grants verdes no Supabase descartável.

O ensaio humano de 60 segundos não foi realizado e não é declarado concluído. Production segue dormente até os gates de PR/merge.

