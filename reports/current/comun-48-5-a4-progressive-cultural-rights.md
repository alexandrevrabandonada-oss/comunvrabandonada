# 48.5-A4 — Direitos Progressivos da Memória Cultural

## A4-R1 — Provisionamento Chromium de CI endurecido (19/08/2026)

Estado atual: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_GREEN_BROWSER_CI_STABLE_AWAITING_ROLLOUT` — PR #351 integrada; aguardando somente rollout controlado A4.

- causa-raiz: seis workflows ativos da PR executavam, em quinze jobs, `npx playwright install --with-deps chromium` de forma independente; os bloqueios observados ocorreram no provisionamento compartilhado antes da execução das suítes, sem evidência de defeito do A4;
- patch: a action local `.github/actions/setup-playwright-browser` restaura `~/.cache/ms-playwright` com chave exata por `runner.os`, `runner.arch`, versão real `@playwright/test` (`1.61.1`) e hash de `package-lock.json`; dependências de sistema continuam sendo garantidas separadamente;
- o helper `scripts/ci/install-playwright-browser.mjs` usa `npx --no-install`, timeout focal de 8 minutos e no máximo duas tentativas somente para falhas classificadas como rede/download, incluindo timeout explícito do processo de provisionamento; em Linux, o timeout encerra o grupo inteiro do processo para não deixar `apt-get` órfão segurando o lock do dpkg; falha emite `COMUN_BROWSER_PROVISIONING_FAILED` e mantém o check vermelho;
- Quality Performance, Experience Coherence, Core Journeys, Civic Graph, Civic Intelligence e Full Surface Migration passaram a usar a action compartilhada. Workflows de outros domínios ou caminhos não envolvidos no bloqueio não foram alterados cegamente;
- contrato estrutural local: `COMUN_BROWSER_PROVISIONING_CONTRACT_GREEN`; A4 focal `40/40`; typecheck, lint, build, unitário `207` arquivos/`1140` testes e `git diff --check` verdes;
- o script de contrato é executado explicitamente por Node e não é coletado como suíte Vitest. O workflow A4 disposable permanece local-only no CI e continua sem fixture Production;
- fechamento remoto: Preview exato `dpl_73czMy9gNUAxAV9mmTsXZnY1EssX` (`READY`, SHA `cc491f8ae16586ef0767270d5e33c94a68895011`), COST-02/CI `32280469519`, A4 disposable `32280469668`, Cultural `32280469488`, Quality `32280469534`, Experience `32280469448`, Core `32280469535`, Civic Graph `32280469743`, Civic Intelligence `32280469423` e Full Surface `32280469457` verdes;
- PR #351 foi marcada ready e mesclada no merge SHA `27c441a4fa03857ece2e022f6f64516d5188989d`; pós-merge COMUN CI `32284486940`/`32284594532`, Cultural `32284486924`, Quality `32284486879`, Experience `32284486935`, Core `32284486892`, Civic Graph `32284486908` e CAPTCHA `32284486941` verdes;

Após os primeiros checkpoints, quatro jobs Civic Graph e o job administrativo confirmaram timeout do apt mirror; as correções de grupo e descendentes não alcançaram o `apt-get` reparentado, que segurou o lock no retry. O candidato corretivo, somente após timeout, encerra o grupo, percorre descendentes Linux por PID e libera exclusivamente os dois lockfiles de apt/dpkg com `fuser`; resolve a falha após uma janela adicional de 5 segundos mesmo se `close` não chegar. Lock transitório também é retryable, com o mesmo limite de duas tentativas.

Migration A4 continua pendente em Production e `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` continua OFF. Nenhuma escrita Production, publicação, Search, asset ou rollout foi realizado.

## A4-R1 — Fechamento pós-merge

- `origin/main` e Production estão no SHA `27c441a4fa03857ece2e022f6f64516d5188989d`; deployment Production `dpl_AdzYY7S6VrhmUTNypfm3LoXpCtdr` está `READY`;
- o cache Chromium foi reutilizado com Playwright `1.61.1`, seguido de provisioning verde; a correção mantém retry limitado, encerra grupos/descendentes e libera somente locks apt/dpkg após timeout;
- migration `20260819130000_comun_cultural_progressive_rights.sql` permanece não aplicada em Production e `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` permanece OFF;
- estado terminal: `COMUN_48_5_A4_R1_PROGRESSIVE_RIGHTS_GREEN_BROWSER_CI_STABLE_AWAITING_ROLLOUT`; nenhum write Production, fixture, publicação, Search, asset ou rollout A4 ocorreu.

## Estado do trabalho

DIAG → PATCH em `codex/48-5-a4-progressive-cultural-rights`, baseado em
`origin/main=826587f3e32177de68a288ed63bf231a91cd3425`. O A3 funcional
`a7a55861458be833048ecb20ec3b5d2ba7b4bb84` permanece ancestral.

Checkpoint terminal reservado: `COMUN_48_5_A4_PROGRESSIVE_CULTURAL_RIGHTS_GREEN_NO_INFERRED_CONSENT`.

## Diagnóstico dos contratos existentes

| Domínio | Raiz/submissão | Direitos existentes | Identidade | Publicação/storage |
| --- | --- | --- | --- | --- |
| Foto/documento | `comun_archive_submissions` + `comun_archive_submission_assets` | relação, fonte, declaração textual, confirmação e crédito; insuficiente para distinguir autoria, titular, exibição e reutilização | anônimo/nome/crédito personalizado | original privado; derivada e `comun_archive_items` somente por revisão |
| Arte | `comun_archive_artwork_submissions`, `comun_archive_artwork_rights`, safety e credits | autoria/titular, consentimento, exibição, impressão, exposição, educação, campanha, derivada, download, terceiros, licença, validade e retirada | anônimo/crédito/nome artístico/coletivo no novo contrato; créditos especializados existentes | original privado; derivadas públicas dependem de rights + safety + revisão |
| História Oral | `comun_archive_oral_history_suggestions`, participantes, consents, templates, sessions e withdrawals | consentimento separado para preservação, transcrição, texto, áudio, imagem, nome, educação, exposição, social, download; templates versionados | identificação completa, primeiro nome, artística, papel ou anônima | bruto/transcrição interna separados de versões e assets públicos; publicação fail-closed |
| Rádio | `comun_radio_contributions`, voice consents, music uses, safety, episodes e transcripts | voz, áudio COMUN, transcrição, cortes, citações, campanha, educação, nome; música possui rights próprio | anônimo/crédito/nome artístico/coletivo no novo contrato | proposta não é programa/episódio; audio público exige asset, consentimento, música, safety e transcript |
| Acervo A1 | `comun_archive_items` + assets + gates públicos | `rights_status`, licença/referência, status/visibility, `public_safe` e revisão; nenhuma projeção pública aceita sem gate | DTO público sanitizado | publicado + público + asset público aprovado; Search/coleções/relações continuam separados |

## Lacuna encontrada

Foto, Arte e Rádio ainda pediam, na entrada, uma declaração binária ou genérica.
O A3 também cria envelopes especializados com direitos em estado inicial, sem
reinterpretar autoria ou consentimento. História Oral já possui o contrato
granular adequado: sua etapa pública de sugestão não coleta consentimento de
gravação e agora explica isso expressamente.

## Patch arquitetural

- não foi criada entidade cultural genérica nem `generic_rights_jsonb`;
- foi criada uma migration pequena, forward-only, sem backfill, seed ou
  publicação: `20260819130000_comun_cultural_progressive_rights.sql`;
- Foto, Arte e Rádio recebem campos tipados de origem/autoria, escopo de uso,
  reutilização, licença declarada, identidade e `rights_state`;
- cada nova declaração ativa registra `rights_contract_version=a4-20260819-v1`
  e `rights_declared_at`; registros antigos ficam `rights_incomplete` e não são
  reinterpretados;
- autoria desconhecida e material de terceiro não confirmado resultam em
  `rights_review_required`, mesmo quando a pessoa escolhe um escopo de exibição;
- `review_only` nunca é tratado como autorização de publicação;
- reutilização licenciada exige licença explícita; música de terceiro continua
  no pipeline próprio de Rádio;
- a flag `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED` nasce OFF. OFF preserva o
  fluxo A3/A2 anterior; ON aplica as declarações progressivas aos novos envios;
- a criação de item fotográfico pelo admin passa a bloquear, quando A4 está ON,
  direitos incompletos ou escopo somente de revisão. Nenhum gate editorial foi
  substituído.

## Segurança e não-publicação

As raízes especializadas permanecem service-role-only/RLS privado. Não há mudança
de bucket, Search, coleção, feed, relação territorial, publicação automática ou
asset público. História Oral continua sem transformar sugestão em depoimento.

## Provas e gates

Implementados localmente:

- `lib/comun-cultural-progressive-rights.test.ts` e o contrato textual A4 cobrem
  30 cenários de decisão/segurança; a suíte focal passou `40/40`;
- gates locais finais: `npm run typecheck`, `npm run lint`, `npm run build`,
  `npm run test:unit` (`207` arquivos / `1140` testes) e `git diff --check`;
- `scripts/comun-cultural-progressive-rights-a4-disposable.sql` prova a
  migration, privilégios privados, constraints, estados especializados,
  rollback e `businessWritesAfterRollback=0`;
- `.github/workflows/comun-48-5-a4-disposable.yml` executa somente Supabase
  local no runner, sem URL, projeto ou secret remoto, e publica o marker
  `COMUN_48_5_A4_PROGRESSIVE_CULTURAL_RIGHTS_DISPOSABLE_GREEN`.

O runner Windows não possui Supabase CLI nem `psql`; por isso a prova SQL não
foi simulada localmente e permanece obrigatória no workflow CI, que instala o
CLI e verifica ausência de credenciais remotas. Pendentes: CI/Preview exatos,
disposable remoto do PR, merge e rollout controlado. Nenhuma fixture Production
foi criada e a flag A4 não foi ativada.

## Deferimentos

- consentimento de História Oral continua sendo registrado no fluxo de entrevista
  e nos templates/admin existentes, não no primeiro formulário de sugestão;
- licença musical continua fora do A4 e depende de `comun_radio_music_uses`;
- revogação jurídica ampla e cópias de terceiros não são prometidas: o produto
  mantém retirada/restrição do COMUN e auditoria conforme os contratos existentes;
- A5 e qualquer nova moderação/editorial estão fora deste patch.
