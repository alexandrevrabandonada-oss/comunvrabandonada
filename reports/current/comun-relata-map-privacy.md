# Privacidade espacial — 48.0D

Localização exacta permanece cifrada no 48.0C. Para a projeção local, o runtime server-side transforma a coordenada em célula métrica por categoria e persiste apenas centro aproximado, grade e raio de incerteza. A API não recebe geohash reversível, HMAC espacial, ciphertext ou nonce.

A precisão é monotônica: nova evidência não pode reduzir o raio de uma projeção existente. Não há reverse geocoder, endereço, mapa público, fotografia, texto de outro relato ou promessa de origem/fogo. A visualização alerta que o ponto é uma área aproximada e oferece lista acessível como alternativa.
