# 48.5-A5-A4 — Primeiro ciclo cultural real Foto/Documento

## A5-A4-R2 — Recuperação do original existente e bloqueio editorial legítimo

Data: 25/08/2026.

- A recuperação ocorreu exclusivamente pela superfície administrativa autenticada do COMUN, sem SQL manual, service role, Dashboard Supabase ou novo envio.
- O runtime anterior falhava antes do handler ao carregar a dependência nativa `sharp` no Linux. A correção de rastreamento de artefatos foi integrada pela PR [#389](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/389), commit de merge `b3016d428e023a0fde72dee6d379a414cf329a42`; Preview/COST-02 e gates aplicáveis ficaram GREEN, e o deployment Production correspondente ficou READY.
- No protocolo `ACERVO-F40C413B`, a ação canônica **Confirmar original privado** foi executada uma vez. Após reload, o mesmo original privado permaneceu vinculado e passou a exibir checksum registrado, integridade verificada e metadados técnicos; não houve novo protocolo, submissão ou original duplicado.
- A reavaliação de readiness permaneceu fail-closed: direitos estão restritos à revisão interna e não há evidência explícita suficiente para licença/autorização pública. Por isso não foram executadas materialização, processamento público, revisão editorial, publicação, Search, coleção ou promoção de asset.
- O original continua privado. Não foram registradas URLs assinadas, cookies, tokens, contato privado ou notas editoriais.
- `ProductionSchemaWrites=0`, `ProductionEnvWrites=0`, `publications=0`, `collectionWrites=0`. A única write de negócio confirmada foi a confirmação do original já existente do próprio protocolo.

Estado terminal: `COMUN_48_5_A5_A4_ORIGINAL_RECOVERY_GREEN_REAL_CYCLE_BLOCKED_EDITORIAL_EVIDENCE_REQUIRED`.

Para retomar este mesmo protocolo, é necessária evidência editorial explícita de direitos/licença/autorização; não é permitido inferi-la a partir da origem, crédito ou envio.

Data: 24/08/2026.

## Baseline

- Parent canônico: `4ca13a896c5e3f91b6b0f47eb01a4f6b28e74433`.
- Branch: `codex/48-5-a5-a4-real-photo-cycle`.
- A3 e A4 permanecem ON/preservados; A5-A1, A5-A2/R1 e A5-A3 permanecem preservados.
- Migration, schema e flag novos: nenhum. `ProductionSchemaWrites=0` e `ProductionEnvWrites=0`.

## Fronteira de publicação

- O publisher genérico foi limitado explicitamente a `photograph` e `document`.
- Raízes de Arte, História Oral, programa de Rádio e episódio/clip de Rádio são reconhecidas pelo `item_type` e pelas child tables canônicas.
- A action refaz as consultas no servidor antes de publicar. Child especializado, tipo sem publisher ou falha de classificação resultam em bloqueio fail-closed.
- A UI especializada remove o workflow genérico e encaminha ao editor canônico com copy humana. Os publishers especializados existentes não foram modificados.
- Nenhum publisher universal, tabela, RPC, migration ou workflow engine foi criado.

## Readiness Foto/Documento

- O detalhe da contribuição reutiliza `lib/archive/cultural-curation-copy.ts`.
- Blockers e próximas ações são apresentados em linguagem humana; códigos internos não são renderizados.
- `publicationEligible=false` continua separando readiness de curadoria da decisão final do publisher.

## Verificação e integração

- Testes focais: 19 GREEN.
- Unit: 215 arquivos / 1.208 testes GREEN; typecheck, lint e build GREEN.
- Surfaces: 226 rotas, zero desconhecidas/incompatibilidades; 4 contratos Node + 28 testes Vitest GREEN.
- Quality e Experience coherence: GREEN.
- Browser local: a rota admin permaneceu fail-closed, redirecionando para login com `redirectTo` correto, sem erro/warning de console. A revisão autenticada do conteúdo será fechada no Preview/CI sem fabricar credenciais.
- Checkpoints: `194d4bd8` e `f1c0fb2b` (`[comun-preview]`); o segundo preservou o conteúdo funcional e corrigiu somente formatação.
- PR [#380](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/380): Preview exato `6065769970` READY; COMUN CI, Cultural Deliverability, contratos autenticados, acessibilidade, segurança, Quality e demais matrizes aplicáveis GREEN.
- Merge/main: `28f9240ae65453db28c752999d747553ed308281`; deployment Production `DaQKgGeH7z4TxKcefzoXYeYkspwt` com status success.

## Piloto real — bloqueio operacional seguro

- O patch foi integrado e ficou READY antes de qualquer tentativa de inventário.
- O conector Supabase recusou a leitura por falta de permissão. A sessão Supabase do Chrome autenticou via GitHub, mas a conta disponível enxerga somente os projetos `quilometrometro` e `VRNoPonto`; o projeto Production canônico do COMUN retornou `You do not have access to this project`.
- Sem uma sessão de operador com acesso ao projeto canônico, não foi possível inventariar candidatos reais nem comprovar a existência de exatamente um candidato seguro. Nenhum ID, protocolo ou dado privado foi lido ou exposto.
- O ciclo real não foi iniciado: nenhuma transição, materialização, associação, publicação, Search, coleção ou promoção de asset ocorreu.
- `ProductionBusinessWrites=0`, `ProductionSchemaWrites=0`, `ProductionEnvWrites=0`, `publications=0`, `SearchWrites=0`.

Estado terminal: `COMUN_48_5_A5_A4_REAL_CYCLE_BLOCKED_OPERATOR_SESSION_REQUIRED`.

## A5-A4-R1 — continuidade de autenticação e autorização administrativa

- O cadastro comunitário deixou de reapresentar o formulário para uma sessão já autenticada: contas Google incompletas seguem para onboarding; contas completas retomam o destino seguro.
- O login administrativo ganhou um fluxo Google próprio, com callback fixado no host canônico e allowlist exclusiva de destinos `/comun/admin`.
- Google Auth continua sendo apenas autenticação. O callback consulta `comun_admin_users` e só conclui acesso quando existe autorização ativa; nenhuma conta recebe papel administrativo automaticamente.
- A pessoa autenticada sem autorização agora vê uma explicação explícita e fail-closed, em vez de retornar silenciosamente ao formulário. Criar outra conta não é apresentado como solução.
- O cadastro duplicado e o acesso administrativo permanecem semanticamente separados. Nenhuma migration, alteração de env, concessão de papel ou write Production foi executada neste patch.
- Verificação local: 23 testes focais GREEN; 1.221 testes unitários GREEN; typecheck, lint, build e `git diff --check` GREEN; login admin renderizado com Google e sem erros de console.

O piloto Foto/Documento continua bloqueado até existir uma conta legitimamente autorizada na própria configuração administrativa do COMUN. O patch não contorna esse gate.
