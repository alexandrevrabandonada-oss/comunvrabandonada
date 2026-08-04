# Carteira COMUN — contrato de recuperação

O código é criado com entropia criptográfica, alfabeto sem caracteres ambíguos e seis grupos de quatro. Ele é exibido somente na criação/rotação, pode ser copiado ou salvo como texto local, nunca aparece em URL, query string, log ou item da carteira. QR não foi prometido nem introduzido.

`POST /api/comun/participation-wallet/recovery/redeem` exige o formato allowlisted, usa hash server-side, aplica rate limit, gira o token HttpOnly, marca a credencial usada e devolve somente itens sanitizados. O código anterior deixa de funcionar. `rotate` revoga credenciais ativas e emite novo par.

Falhas de formato, existência e posse são indistinguíveis na API. Limpar o cookie não remove relatos; sem o código, perde-se apenas a conveniência local. Não há recuperação automática por e-mail, telefone ou conta.
