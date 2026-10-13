# 49-E3 — usar, participar e aprender a organizar

Base: merge #543 `86329f053af7b5fbf6d5c42e73bb08b1047a1ec1`.
Branch: `codex/comun-49e-entry-20261013`.

## Capacidades conferidas

- Busca, pautas, ações, comunidades e orientação pública são rotas existentes.
- Ações dependem da release existente; quando pausadas, o #543 oferece pautas e participação. Nenhuma ativação nesta rodada.
- Escola possui runtime/progresso, mas seu schema continua bloqueado no #523. A entrada de formação usa orientação pública sem depender dessa ativação.
- Nenhuma capacidade de criar/administrar núcleo é prometida nesta entrada; abrir comunidade não atribui vínculo ou papel.

## Alteração

O mesmo componente de caminhos aparece na home canônica, home legacy pública e Participar.
O terceiro caminho abre uma seção da orientação existente e oferece consulta a comunidades.
URL pública com fragmento e somente seleção de experiência; não transporta registro privado.
Retomada por favoritos/voltar do navegador, sem um sistema adicional de identidade/progresso.

## Verificação

- PASS: 29 testes focais (experiência, orientação e superfície pública), zero skipped.
- PASS: TypeScript, ESLint focal, build webpack, Prettier e git diff --check.
- PASS: 10 testes Chromium, mobile 390x844 e desktop 1366x768; canônica/legacy, teclado, retorno, consulta sem JavaScript, axe sem violações serious/critical e zero escritas API no fluxo novo.
- PASS: inspeção complementar da home mobile sem overflow ou erros de aplicação; screenshots fora do Git. Browser plugin não disponível, usado Playwright.
- PENDING: Preview e CI do futuro SHA exato.
- NOT_RUN: aparelhos reais, Safari/Firefox, leitor de tela humano e ensaio de compreensão.
- Sem prova de RLS nova: nenhum runtime, política ou escrita foi alterado.

## Reconciliação #543

Head revisado `5362e963a32c9b701876fe683ac7cd7fd243bae0`: 21 SUCCESS, 76 SKIPPED,
zero pendências/falhas; Preview GitHub deployment `7040482737` success no SHA exato.
Sem regras de proteção/rulesets ou reviewers solicitados observados. Diff de um arquivo
revisado antes do merge normal autorizado. Merge `86329f053af7b5fbf6d5c42e73bb08b1047a1ec1`.
Deployment Production `7040894833` success; endpoint público quality-status confirmou o SHA exato; Civic Graph pós-merge PASS (run 38411651935). Quality/Core/Experience ainda PENDING.
Não transferir PASS do candidato para o merge.

## Limites

#542 e #523 draft preservados. Sem segredos, Auth, backups, migrations, dados
Production, flags ou indexação. Este candidato não encerra V1 nem certifica organização real.
