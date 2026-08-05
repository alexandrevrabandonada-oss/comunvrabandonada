# Catálogo territorial de bairros — integração local

## Resultado

`COMUN_TERRITORY_NEIGHBORHOOD_CATALOG_LOCAL_READY`

O onboarding agora oferece seleção opcional de bairro para Volta Redonda a partir de um snapshot textual do cadastro público Prefeitura/IPPU. A escolha é ampla, privada e não substitui localização criptografada de relatos.

## Fonte

- Catálogo de shapefiles do PortalVR/IPPU: https://www2.voltaredonda.rj.gov.br/smp/index.php?catid=10&id=15&option=com_content&view=article
- Relação pública de logradouros e bairros: https://www2.voltaredonda.rj.gov.br/ippu/mod/informacoes/logradouros.php
- Snapshot: `2026-08-04-textual-preliminary`
- Geometria oficial: ainda não incorporada; o WFS foi mantido como fonte futura de validação.

## Implementação

- catálogo: `lib/volta-redonda-neighborhoods.ts`;
- onboarding: `components/community-onboarding-flow.tsx`;
- persistência local-only: migration `20260805090000_comun_member_profile_territory_selection.sql`;
- feature flag: `COMUN_TERRITORY_CATALOG_LOCAL`;
- manifesto: `supabase/local-releases/20260805090000-comun-territory-neighborhood-catalog.json`.

Com a flag desligada, a ação de perfil não envia as novas colunas, preservando compatibilidade com Production sem a migration local. Nenhum dado remoto foi consultado ou alterado.

## Privacidade

- bairro e município são opcionais;
- não há coordenada, endereço ou geometria no perfil;
- o valor não é projetado publicamente;
- a localização precisa continua separada e protegida pelo Relata.

## Próxima validação

Conferir a lista contra o shapefile oficial quando o endpoint estiver acessível e registrar aliases/loteamentos separadamente, sem transformar nomes populares em limites oficiais.

## Smoke local

O responsável pelo produto confirmou cadastro, login, acesso à Minha Participação e conclusão do onboarding no laboratório local. A confirmação é um smoke operacional do ambiente, não um ensaio humano integrado nem autorização para ativação pública.
