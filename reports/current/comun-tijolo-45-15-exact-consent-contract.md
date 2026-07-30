# Tijolo 45.15 — contrato de consentimento para localização exata

Objetivo: tornar explícita, antes do envio, a autorização para publicar o ponto exato da calçada e vincular essa decisão ao payload confirmado da contribuição.

Escopo:

- texto e checkbox explícitos no formulário;
- `consent_location_precision=exact` no payload confirmado;
- ação administrativa separada para publicação exata;
- publicação exata bloqueada sem um único upload confirmado com consentimento;
- fotografia original e identidade permanecem privadas;
- nenhuma coordenada é incluída em logs, relatórios ou auditoria administrativa;
- nenhuma migration ou escrita em produção faz parte deste patch.

O registro inaugural já publicado permanece regido pela autorização humana específica do ciclo 14. Este contrato vale para as contribuições futuras.
