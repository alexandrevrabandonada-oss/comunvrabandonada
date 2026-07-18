# Diagnóstico do reset transitório — Sprint 33.2.1

## Evidência

O reset controlado concluiu verde com 52/52 migrations e seed vazio. Em uma rodada posterior, após migrations completas, o polling recebeu `auth http=502` por 59 tentativas. O log de Kong mostrou `connect() failed (111: Connection refused)` para o upstream de Auth, enquanto `supabase_auth_COMUM_VR_ABANDONADA` estava saudável.

## Classificação

- Reset verde controlado: **C**.
- Incidente de Kong após reset: **B recuperável por restart restrito**, pois migrations estavam completas e todos os containers obrigatórios estavam saudáveis exceto a rota Kong → Auth.

## Recuperação aplicada

Foi executado um único `docker restart supabase_kong_COMUM_VR_ABANDONADA`. O helper aguardou Kong saudável e duas respostas completas consecutivas de DB, REST, Kong, Auth e Storage. A recuperação ocorreu em aproximadamente 8 s; o comando completo levou aproximadamente 17 s.

Não houve restart de banco, Auth, Docker Desktop, remoção de volume, alteração de rede ou acesso remoto.
