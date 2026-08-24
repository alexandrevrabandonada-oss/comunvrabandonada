# 48.5-A5-A2 — workspace de materialização privada especializada

## Estado de implementação

Parent main: `355f779df41dcd40722ba4e9ab20bdecc8426c9f`.

Este slice operacionaliza a continuidade privada de História Oral e Rádio a partir das autoridades atômicas A5-A1 já instaladas. Arte recebe somente o schema e a ação server-side preparada: a UI não expõe seu CTA enquanto a migration não estiver instalada em Production.

## Contrato de readiness

`lib/archive/cultural-curation-readiness.ts` segue como o único resolver. Ele diferencia:

- `readyForPrivateRootCreation`: evidência disponível no envelope, status elegível e decisão editorial explícita;
- `readyForExistingRootLink`: somente para correção, complemento ou retirada de Rádio, sempre para uma raiz escolhida explicitamente;
- `readyForEditorialReview`: direitos, consentimentos, segurança, assets e derivados após a raiz;
- `publicationEligible=false`: invariável neste slice.

Arte não exige previamente asset, derivada, crédito canônico, autoria confirmada, licença, rights child ou safety child. Esses gates continuam bloqueando editorial review depois do rascunho privado. `creator_credit_suggestion` permanece apenas sugestão.

## História Oral e Rádio

- História Oral ganhou lista e detalhe de sugestões em `/comun/admin/acervo/historias-orais/sugestoes`. A ação exige admin/editor, relê a sugestão, calcula readiness no servidor e invoca exclusivamente `comun_materialize_oral_history_suggestion_private_root_v1`; replay retorna a mesma raiz e redireciona ao editor oral.
- Rádio ganhou workspace de triagem e detalhe em `/comun/admin/radio/contribuicoes/[id]`. `program_proposal` cria apenas programa privado; `community_audio` e `authorized_testimony` exigem programa canônico explicitamente selecionado para criar episódio privado; `correction`, `complement` e `withdrawal` vinculam somente uma raiz existente. `own_music`, pauta e agenda não criam raiz.
- Nenhuma ação aceita readiness do browser como autoridade. Todas exigem admin/editor, relêem a origem, resolvem o contrato atual, chamam RPC atômica e registram auditoria sanitizada com `publication=not_authorized`.

## Arte — boundary de schema

Migration aditiva ainda não promovida:

- arquivo: `supabase/migrations/20260824001340_comun_artwork_submission_private_materialization.sql`;
- SHA-256: `b9da07e8da93aa22d41119eb3a0f406176595bd4fbdf96bf1d75e16ddfd02354`;
- guard de vínculo imutável e tipado (`territorial_artwork`, `draft`, `private` + child `comun_archive_artworks`);
- RPCs `comun_link_artwork_submission_private_root_v1` e `comun_materialize_artwork_submission_private_root_v1`, com `FOR UPDATE`, replay idempotente, conflito fail-closed e `security invoker`;
- EXECUTE revogado de `public`, `anon` e `authenticated`, concedido somente a `service_role`.

A materialização insere somente item `territorial_artwork` `draft/private` com `rights_status=unknown`, artwork `draft` e o vínculo de proveniência. Não cria agente, crédito, titular, rights child, safety, asset, derivada, licença, Search, coleção ou publicação. A interface de Arte mostra readiness e explica o rollout pendente sem expor o botão de materialização.

## Provas e limites

- Testes focais cobrem Arte pré-raiz, gates pós-raiz, História Oral pré-consentimento final, Rádio programa/episódio/reconciliação, Música fora e `publicationEligible=false`.
- O contrato estático cobre RPCs atômicas, lock, tipagem, grants server-only, refetch/readiness/auditoria server-side e CTA de Arte dormente.
- Recuperação local de disco: o host passou de 20 MB no incidente original para 8,02 GiB livres, sem apagar volumes Docker, fontes, arquivos de usuário ou perfis/cache de navegador. Foram limpos somente imagens Docker não usadas e build cache regenerável; o cache `_npx` foi compactado de modo reversível. `DockerVolumesRemoved=0`, `UserFilesRemoved=0`, `SourceFilesRemoved=0`.
- `typecheck`, lint, testes focais (18) e `npm run test:unit` (211 arquivos / 1.165 testes) passaram localmente. O build produziu `BUILD_ID` após a recuperação.
- A workflow `.github/workflows/comun-48-5-a5-a2-artwork-disposable.yml` executa Supabase exclusivamente local, aplica migrations em ambiente efêmero e prova fresh apply, replay, legado sem backfill, imutabilidade, alvo errado, fonte rejeitada, grants e zero projeções públicas antes de `ROLLBACK`.
- A prova descartável permanece local-only na workflow CI; nenhuma conexão ou write Production foi executado nesta recuperação.

## Limites operacionais

`migrations=1` no repositório e `ProductionSchemaWrites=0` neste slice. A3 e A4 permanecem ON/preserved; A5-A1 permanece ativo/preserved. Não houve alteração de env, chamada a Supabase Production, publicação, Search, asset público, coleção ou business write Production.

Próximo boundary exato após integração e CI: `A5-A2-R1 — rollout controlado da migration de materialização privada de Arte`. Não iniciar esse rollout neste slice.
