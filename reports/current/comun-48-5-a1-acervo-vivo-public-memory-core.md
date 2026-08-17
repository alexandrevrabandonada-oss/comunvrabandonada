# COMUN 48.5-A1 — Acervo Vivo

Status: `COMUN_48_5_A1_ACERVO_VIVO_PUBLIC_MEMORY_CORE_GREEN_SPECIALIZED_GATES_FAIL_CLOSED`

Baseline: `4d738700d58f47adecc6e173514f4c432273dd96` (A0 exact main).

## Decisão

`comun_archive_items` continua sendo a identidade durável. A projeção pública
agora é server-only e tipada (`PublicMemoryArtifactV1`, `PublicMemoryAssetV1`,
`PublicMemoryCollectionV1`, `PublicMemoryDirectoryV1`). O navegador não recebe
rows brutas nem metadados de armazenamento.

## Gates

- raiz: publicado, público, publicado em data válida e deliverable público;
- assets: `public_safe`, aprovados e com URL pública;
- Arte: consentimento de exibição, `allow_comun_display`, validade/embargo e
  safety review aprovados;
- Música: facets derivadas apenas de pais públicos;
- Rádio: raiz pública, consentimento de voz, direitos musicais, safety e asset
  público são revalidados na listagem;
- História Oral: helper defensivo existente preservado;
- identificação: hipótese humana não altera fato canônico e não há fallback
  numérico sintético (incluindo o antigo `860`);
- coleções e relações continuam dependendo da elegibilidade dos itens filhos.

## Limites e segurança

Não houve migration, alteração de bucket, upload, delete, API nova, flag de
segurança, reindex ou business write. Conteúdo com gate especializado inválido
é omitido, não convertido em item genérico. Direitos/consentimentos, originais,
transcrições brutas, notas editoriais e IDs de autenticação não entram no DTO.

## Validação

- `npm run typecheck` verde;
- `git diff baseline...HEAD -- supabase/migrations` deve permanecer vazio;
- smoke e performance devem usar a projeção bounded, sem download de mídia.

Próximo slice: `48.5-A2` (sem iniciar neste branch).

## A1-R1 — fechamento real dos gates

O primeiro A1 revelou bypasses de detalhe/listagem e uma projeção que ainda
descartava especializações. Esta revisão corrigiu-os sem migration:

- `isPublicArtworkEligible` é a única regra de Arte para lista e detalhe;
- `isPublicArchiveAssetEligible` exige bucket público seguro, aprovação, URL e
  direito explícito (`licensed`, `permission_granted` ou `public_domain`);
- `resolvePublicRadioEpisodeEligibility` é compartilhado por lista e detalhe,
  incluindo raiz, voz, música, safety, asset e transcript;
- coleções removem filhos especializados inelegíveis;
- Música aplica o mesmo gate de asset no detalhe;
- o diretório canônico agora inclui Arte, Música, História Oral e Rádio com
  `specialization` correto e nunca rebaixa falha especializada para `generic`;
- testes focais cobrem asset rights, datas de Arte e paridade Rádio.

O fallback `860` permanece removido. A1-R1 continua sem A2, uploads, conteúdo
de produção, API nova, buckets, migration ou business write.
