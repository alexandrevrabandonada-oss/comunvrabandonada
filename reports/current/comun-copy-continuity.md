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

Revisão adicional: o checkpoint `bf1b5f98` foi recusado localmente porque trocar
o protocolo conservava a confirmação anterior de cópia. Regressão real Chromium:
FAIL antes da correção (1 confirmação antiga), PASS depois. Os wrappers agora
reinicializam o estado quando seu conteúdo muda. Nenhum timer arbitra a prova:
o teste espera o novo protocolo renderizado.

Correção funcional `39198b1cc1de5ccae7fe4b55d58e21fd47c8ef03`, reconciliada com
main `1169159158e1978d08930416800f394f1558192f` em
`8203227ca2b192f1c81102d8a3bc1b9e93aa8f79`, tree
`1575ecef93da51a950b1dab56e2e8982a8955fb6`. Seis cenários Chromium PASS nesse
SHA reconciliado, zero skipped. Build, TypeScript e ESLint PASS na correção;
diff dos componentes/teste/dependências/configuração entre esses dois SHAs vazio.
As provas remotas/Preview de `bf1b5f98` continuam históricas e não certificam
o novo checkpoint. #541 permanece draft até seus próprios gates.

#540 integrado como preparação em `11691591`: não certifica recuperação real,
não aplica schema e preserva lote Auth autorizado 0/6. Assunto Source de mudança
de e-mail ainda requer valor fiel; “ok” não foi assumido como conteúdo.

## Fechamento remoto e pós-merge

Head revisado `e46a495f`: 37 SUCCESS, 83 SKIPPED, zero failure/pending.
Workflow Chromium `38259617336`: seis PASS/zero skipped. Preview Git Vercel
`dpl_9sVZWwGp2VQGzuWmDYXar577FQ23` READY, GitHub deployment `7015885973`
Preview success e COST-02 SUCCESS. Quality `38259617608` attempt 2 SUCCESS;
reexecutado somente P1T após 502 pós-reset anterior aos gates. Bateria principal
da attempt 1 preservada. Coerência `38259617491` attempt 2 SUCCESS após 502 no
reset. Mesmo SHA entre tentativas, sem correção fictícia de produto ou retry novo.

Merge normal #541: `8bb8cd9de9afe68293de82c6b7ca97ba4730d01f`, 14:40:58 UTC,
tree `8f3c6d672bb38614b0c13f30ff0c6d88e9a733da`, idêntica ao head revisado.
CI pós-merge `38264701169` SUCCESS. Deploy deste merge **BLOCKED/UNPROVEN**:
consultas autenticadas Vercel CLI/conector e GitHub não localizaram deployment
para esse SHA; domínio ainda serve `11691591`, cujo deploy foi certificado.
Quality pós-merge `38264701423` FAIL com
`COMUN_QUALITY_EXPECTED_SHA_NOT_DEPLOYED`. Core Journeys `38264701160` e Civic
Graph `38264701196` também falharam ao aguardar o SHA exato, conforme seus logs.
Coerência pós-merge `38264701564` posteriormente SUCCESS no disposable; não
substitui a disponibilidade do novo SHA em Production.

Projeto/repositório/main corretos, createDeployments enabled; classificador do
diff real exige BUILD/runtime-path-change. Sem deployment cancelado que prove
ignoreCommand. Eventos consultados no projeto não explicaram a ausência;
endpoint GitHub installation exige autenticação App indisponível (401).
**Causa da falta de entrega do evento Git não comprovada**; não chamar isso de
regressão da aplicação, sucesso de deploy ou quota sem evidência.

Próxima ação: inspecionar/recuperar a entrega Git→Vercel desse merge exato por
interface suportada; conferir Git source/SHA/READY, GitHub Production success e
SHA servido antes de reexecutar os jobs pós-merge que falharam. Não repetir o CI
enquanto o domínio permanecer no SHA anterior. Nenhum deploy manual, reconnect,
configuração Vercel, flags ou schema alterados para esconder a falha.

Bundle SHA-256 `ed3108c759cf304f0c49535717886dfa7df513c885fcd9a06989b52ac8b141ea`:
importação independente PASS, SHA/tree/fsck conferidos; exige main `11691591` e
ancestral `400b17b3`. Evidências privadas preservadas no E:, sem dados/segredos Git.
Preparação #540 integrada/certificada; produto #541 integrado, disponibilidade
Production do novo código ainda não certificada. Escola NOT_RELEASED; V1 aberta.
