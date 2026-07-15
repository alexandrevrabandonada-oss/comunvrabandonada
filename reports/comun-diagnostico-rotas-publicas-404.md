# Diagnóstico — rotas públicas centrais

Data: 15/07/2026. Diagnóstico realizado antes das alterações de acesso de campo.

## Resultado

As rotas `/comun/pautas`, `/comun/comunidades`, `/comun/dossies`, `/comun/seguranca` e `/comun/relatar` existem em `app/` e retornam HTTP 200 no servidor local e no alias de produção. Não há `notFound()` nas listagens; ele permanece limitado aos slugs inexistentes de pauta e dossiê. O `proxy.ts` só intercepta `/comun/admin/:path*`, sem rewrite, redirect ou matcher público.

## Causa comprovada do falso 404

O `smoke:public-ui` ignorava `COMUN_BASE_URL` e sempre usava `NEXT_PUBLIC_SITE_URL` carregado de `.env.local`. Durante o gate anterior, essa variável apontava para um deployment antigo, produzindo 404 que não representavam o alias atual. As rotas não dependem de fixtures para existir: dossiês e pautas têm estado vazio no componente; segurança e relato são institucionais/formulário.

## Contrato adotado

- Listagens centrais retornam 200, inclusive vazias, com próxima ação segura.
- Slugs inexistentes permanecem 404.
- Erros de consulta não expõem stack trace nem conteúdo privado.
- O smoke passa uma base explícita e registra o destino testado, impedindo confundir deployment antigo com produção.
