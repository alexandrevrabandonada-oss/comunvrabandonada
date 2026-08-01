# Tijolo 47.9A2 — matriz canônica de rotas e shell

> Gerado por `npm run experience:shell:matrix`. A classificação executável vive em `lib/comun-shell-contract.ts`; componentes não mantêm listas paralelas de pathname.

Rotas inventariadas: **190**. Contagem por modo: `public_web` 1 · `member_root` 5 · `member_nested` 73 · `admin` 88 · `auth` 6 · `institutional` 4 · `immersive` 13.

| Rota | Modo | Grupo | Superfície | App bar | Bottom nav | Footer | Scroll |
|---|---|---|---|---|---|---|---|
| `/` | `public_web` | `public_web` | content/navigation | `brand` | `none` | `institutional` | `document` |
| `/comun` | `member_root` | `member_root:inicio` | content/navigation | `root` | `full` | `none` | `document` |
| `/comun/acervo` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/[slug]` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/arte` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/arte/[slug]` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/arte/contribuir` | `member_nested` | `archive` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/arte/criadores/[slug]` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/arte/direitos-e-retirada` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/artistas` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/artistas/[slug]` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/colecoes` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/colecoes/[slug]` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/contribuir` | `member_nested` | `archive` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/contribuir/artista` | `member_nested` | `archive` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/direitos-e-remocao` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/historias-orais` | `member_nested` | `archive` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/historias-orais/[slug]` | `member_nested` | `archive` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/historias-orais/contribuir` | `member_nested` | `archive` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/historias-orais/direitos-e-retirada` | `member_nested` | `archive` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/identificar` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/identificar/[slug]` | `member_nested` | `archive` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/musica` | `member_nested` | `archive` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/acervo/musica/[slug]` | `member_nested` | `archive` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/acoes` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acoes/[slug]` | `member_nested` | `action_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acompanhar` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acompanhar/[protocol]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/acompanhar/[protocol]/ouvidoria` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/admin` | `admin` | `admin` | content/navigation | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/arte` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/arte/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/arte/contribuicoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/arte/creditos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/arte/direitos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/arte/novo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/artistas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/artistas/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/artistas/contribuicoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/artistas/pendencias` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/artistas/reivindicacoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/colecoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/contribuicoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/contribuicoes/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais/consentimentos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais/novo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais/piloto` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais/transcricoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/historias-orais/transcricoes/trabalho` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/identificacao` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/identificacao/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/musica/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/musica/observabilidade` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/novo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/processamento` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/processamento/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/processamento/dead-letter` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/storage` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/sugestoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acervo/verificacao` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/acoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/alertas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/anexos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/auditoria` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/calcadas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/calcadas/encaminhamentos/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/calcadas/operacao` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/calcadas/piloto` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/calcadas/prioridade` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/comunidades` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/dossies` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/dossies/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/dossies/[id]/preview` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/dossies/revisoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/equipe` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/lancamento` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/login` | `auth` | `auth` | operation/admin | `brand` | `none` | `none` | `document` |
| `/comun/admin/notificacoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observabilidade` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]/campanhas/[campaignId]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]/campanhas/[campaignId]/acessos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]/campanhas/[campaignId]/prontidao` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]/metodologia` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]/metricas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/observatorios/[id]/observacoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/operacao` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/operacao/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/operacao/superficies/[surface]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/organizacao` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/organizacao/calendario` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/organizacao/entrada` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/organizacao/entrada/vincular` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/pautas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/pautas/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/pautas/[id]/aplicativo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/pautas/contribuicoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/protocolos-oficiais` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/consentimentos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/contribuicoes` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/direitos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/episodios` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/episodios/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/episodios/novo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/grade` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/programas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/radio/programas/novo` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/relatos` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/relatos/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/rodas` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/rodas/[id]` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/admin/territorio` | `admin` | `admin` | operation/admin | `admin` | `none` | `none` | `contained` |
| `/comun/ajuda` | `institutional` | `institutional` | content/navigation | `brand` | `none` | `institutional` | `document` |
| `/comun/arte` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/arte/[slug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/arte/colecoes/[slug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/arte/contribuir` | `member_nested` | `member_nested` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/arte/criadores/[slug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/arte/direitos-e-retirada` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/busca` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/buscar` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/c/[slug]` | `member_nested` | `community_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/c/[slug]/participar` | `member_nested` | `community_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/caixa-de-entrada` | `member_root` | `member_root:caixa` | content/navigation | `root` | `full` | `none` | `document` |
| `/comun/calcadas` | `immersive` | `sidewalk_miniapp` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/calcadas/mobilizacao` | `immersive` | `sidewalk_miniapp` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/calcadas/pressao/[id]` | `immersive` | `sidewalk_miniapp` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/calcadas/prioridades` | `immersive` | `sidewalk_miniapp` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/calcadas/registros/[slug]` | `immersive` | `sidewalk_record` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/calcadas/resultados` | `immersive` | `sidewalk_miniapp` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/campo` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/campo/turno` | `immersive` | `immersive` | content/navigation | `contextual` | `none` | `none` | `immersive` |
| `/comun/campo/turno/registrar` | `immersive` | `immersive` | form/task | `contextual` | `none` | `none` | `immersive` |
| `/comun/comunidades` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/conta` | `member_nested` | `member_nested` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/conta/privacidade` | `member_nested` | `member_nested` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/cooperativas` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/criar-conta` | `auth` | `auth` | form/task | `brand` | `none` | `none` | `document` |
| `/comun/dossies` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/dossies/[slug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/entrar` | `auth` | `auth` | form/task | `brand` | `none` | `none` | `document` |
| `/comun/explorar` | `member_root` | `member_root:explorar` | content/navigation | `root` | `full` | `none` | `document` |
| `/comun/mapa` | `immersive` | `map` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/mapa/[slug]` | `immersive` | `map` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/mapa/contribuir` | `immersive` | `map` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/mapa/contribuir/confirmacao` | `immersive` | `map` | map/miniapp | `contextual` | `none` | `none` | `immersive` |
| `/comun/minha-participacao` | `member_root` | `member_root:minha_area` | content/navigation | `root` | `full` | `none` | `document` |
| `/comun/observatorios` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]/acoes` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]/campanhas/[campaignSlug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]/campo/[campaignSlug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]/dados` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]/mapa` | `member_nested` | `member_nested` | map/miniapp | `contextual` | `none` | `none` | `document` |
| `/comun/observatorios/[slug]/registrar` | `member_nested` | `member_nested` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/offline` | `institutional` | `institutional` | content/navigation | `brand` | `none` | `institutional` | `document` |
| `/comun/onboarding` | `auth` | `auth` | form/task | `brand` | `none` | `none` | `document` |
| `/comun/participar` | `member_root` | `member_root:participar` | content/navigation | `root` | `full` | `none` | `document` |
| `/comun/participar/confirmacao` | `member_nested` | `participation_confirmation` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/pautas` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/pautas/[slug]` | `member_nested` | `pauta_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/pautas/[slug]/memoria/[memorySlug]` | `member_nested` | `pauta_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/pautas/[slug]/registros/[recordSlug]` | `member_nested` | `pauta_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/preview/esteira-politica` | `immersive` | `immersive` | content/navigation | `contextual` | `none` | `none` | `immersive` |
| `/comun/projetos` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/projetos/[slug]` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/protocolo-popular` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/radio` | `member_nested` | `radio` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/radio/contribuir` | `member_nested` | `radio` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/radio/direitos-e-consentimento` | `member_nested` | `radio` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/radio/episodios/[slug]` | `member_nested` | `radio` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/radio/grade` | `member_nested` | `radio` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/radio/programas/[slug]` | `member_nested` | `radio` | player/media | `contextual` | `none` | `none` | `document` |
| `/comun/reciclagem` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/recuperar-acesso` | `auth` | `auth` | form/task | `brand` | `none` | `none` | `document` |
| `/comun/redefinir-acesso` | `auth` | `auth` | form/task | `brand` | `none` | `none` | `document` |
| `/comun/relatar` | `member_nested` | `member_nested` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/relatar/confirmacao` | `member_nested` | `member_nested` | form/task | `contextual` | `none` | `none` | `document` |
| `/comun/resultados` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/seguranca` | `institutional` | `institutional` | content/navigation | `brand` | `none` | `institutional` | `document` |
| `/comun/territorio-tomado` | `institutional` | `institutional` | content/navigation | `brand` | `none` | `institutional` | `document` |
| `/comun/territorios` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/territorios/[slug]` | `member_nested` | `territory_detail` | content/navigation | `contextual` | `none` | `none` | `document` |
| `/comun/transporte` | `member_nested` | `member_nested` | content/navigation | `contextual` | `none` | `none` | `document` |

## Inventário transversal

- `ComunAppShell` e `ComunShell`: shell público/membro, PWA, skip link, desktop header, app bar e chrome condicionado pelo contrato.
- `ComunMobileAppBar`: app bar contextual; metadados de rota vêm do contrato e páginas podem fornecer título/contexto da entidade.
- `ComunMobileNavigation`: cinco roots, safe area, badge sanitizado, retorno ao topo, scroll e href/filtros preservados por aba.
- `AdminShell`: administração ampla existente; a Central piloto usa `ComunOperationalShell` para comprovar separação administrativa.
- `MiniAppExperienceShell` e `PautaAppShell`: layouts aninhados de ferramenta/pauta; a flag é propagada sem quebrar deep links.
- Mapas: `/comun/mapa*` e `/comun/calcadas*`; formulários: rotas de contribuição, relato, conta, acesso e registro; players/mídia: Rádio, música e histórias orais.
- PWA: `ComunPwaRuntime`, manifest e service worker permanecem compartilhados; o shell V2 acrescenta `100dvh`, visual viewport e safe areas sem alterar a política de cache.

## Regra de fallback

Sem `?experiencia=app-v2`, a árvore legada continua sendo renderizada. Com a flag, somente a classificação acima decide chrome, footer e navegação; nenhuma rota ou deep link é removido.
