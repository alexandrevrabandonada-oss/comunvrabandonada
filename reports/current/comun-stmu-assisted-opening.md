# Abertura assistida STMU

A abertura existe apenas em laboratório com `COMUN_STMU_WHATSAPP_ASSISTED_LOCAL=enabled` e todas as flags cumulativas de Ônibus, Relata, Carteira e forwarding locais.

O destino é validado por host/path exatos (`wa.me/5524992958558`), sem query, sem redirect aceito, sem prefill e sem anexos. A pessoa precisa tocar em “Copiar mensagem” e, separadamente, “Abrir WhatsApp”. O COMUN não controla a sessão externa e não envia.

O retorno usa estados `opened_by_person`, `not_sent`, `other_data`, `abandoned` ou declaração da pessoa `sent`; declaração não equivale a confirmação da STMU. O protocolo oficial permanece `unconfirmed`.
