# Fiscaliza VR — abertura assistida

O fluxo local exige cumulativamente `COMUN_FORWARDING_LOCAL` e `COMUN_FISCALIZA_ASSISTED_OPENING_LOCAL`, carteira local, adaptador observado e URL exata HTTPS `https://www.voltaredonda.rj.gov.br/fiscalizavr`.

Antes do gesto, a Carteira mostra destino, serviço, requisitos, mensagem preparada, localização e contato privados, quantidade de fotografias e o aviso “Nada foi enviado”. Os cartões têm cópia individual; não há prefill, query string, extensão, JavaScript injetado, clipboard de fotografia ou acesso à sessão externa.

Como o destino observado redireciona para host legado indisponível, a validação de integridade rejeita o host inesperado e a abertura não é promovida para produção. O evento local, quando ensaiado, é somente `opened_by_person`; submissão e protocolo oficial continuam `unconfirmed`.
