# COMUN 48.1B-P4 — smoke de Production

Estado: pendente. Nenhum código P4 foi mesclado, nenhuma migration P4 foi aplicada e nenhuma flag P4 foi ativada até a conclusão da CI do head exato.

Baseline preservado:

- Conta, Carteira, Relata textual, fotos privadas e localização privada: ON;
- mapa histórico de Calçadas: ON;
- intake P4 e projeção P4: ainda OFF/ausentes;
- coletivos, território, Google, Ônibus e forwarding: OFF;
- `launch_publicly=false`.

Gates futuros, em ordem:

1. merge com flags OFF;
2. promoção da única migration com flags OFF e postflight RLS/grants;
3. ativação de `COMUN_SIDEWALK_RELATA_ENABLED` e smoke privado com cleanup em `finally`;
4. ativação de `COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED`, sem publicação sintética;
5. prova read-only da fila administrativa e do mapa histórico.

Os runners operacionais estão versionados, usam apenas secrets atuais por nome e não expõem valores. O smoke P4A remove localização, anexo, relato e Carteira sintética em `finally`; recovery de crash é escopado pelo marcador `P4-SMOKE-*` e usa somente retirada lógica, sem hard delete.

Não emitir o terminal P4 antes desses gates.
