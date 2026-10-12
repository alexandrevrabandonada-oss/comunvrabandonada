# Continuidade da cópia — 12/10/2026

Base main: `400b17b350a00de913b6e802586c890c1e2999d9`.
Candidato funcional: `42f7ddd6a55b0203def07dd0136b3634526c8b07`;
tree `bfba444f0a9eab9f49450006c2ea305790a0da09`.

Finding demonstrado: copiar texto da ouvidoria rejeitava a Promise sem tratar
permissão negada/API indisponível. A confirmação do relato apenas recomendava
cópia manual, sem controle selecionável/foco. Ambos agora usam o mesmo componente:
sucesso só após aceite da área de transferência; operação pendente não duplica;
falha abre campo read-only com texto exato, foco e seleção; fechar retorna ao botão.
Não envia texto a instituição, não navega, não grava estado nem transporta identidade.
Protocolo continua sendo handle privado da superfície autorizada, não URL pública.

PASS local no conteúdo funcional acima: cinco cenários reais Chromium/Playwright
1.61.1, viewport desktop 1280×800 e celular 390×844. Clipboard é dependência
controlada; React/componentes e CSS do repositório são reais, sem mock do DOM.
Sucesso, negação, ausência da API, concorrência pendente, teclado/foco e conteúdo
exato passaram; zero pageerrors e zero requisições não GET/HEAD. Axe: zero findings
serious/critical nos dois estados manuais. Prova é do componente isolado com
fixtures sintéticas, não da rota autenticada completa, RLS ou aparelho real.

Comando: `node --test scripts/product/copy-text-browser.node-test.mjs`.
ESLint focal, TypeScript completo, build Next16.3.8, Prettier e diff-check PASS.
Primeiro build recusou node_modules em junction fora da raiz Turbopack; instalação
independente com lockfile existente resolveu o ambiente, sem alterar contrato/app.

Screenshots sintéticos privados fora do Git: desktop SHA-256
`2c4d87118b08737da6c5cb6ed58b4832d0932cf88990776f5af8bce372400c96`;
celular `1bd2ed9e8a1f33f08850deffb63f755b43f289d38157a84cdc31f1ebf8afaf63`.
Browser de painel não foi repetido: canais previamente falhos sem mudança material.
Playwright regular permitido pelo usuário para validação local independente.

Workflow focal, contents read, sem secrets Supabase/Production, repete os cinco
casos no Chromium. Preview/checks do checkpoint exigem prova própria; ainda não
há integração/deploy Production certificado desta mudança.

NOT_RUN: rota autenticada end-to-end, aparelhos reais, Safari/Firefox e ensaio
humano. Nenhuma prova dessas foi substituída por HTML, mock ou build.

Escola/#523 permanecem separados: seis preflights não dispensados. Nenhuma
migration, flags, indexação ou dados Production alterados; V1 não concluída.
Próximo passo: revisar candidato, Preview exato e gates; integrar somente quando
todos os aplicáveis estiverem verdes e certificar pós-merge antes de outra integração.
