# COMUN — Tijolo 48.0C — localização privada, anexos protegidos e casos coletivos

Atualizado em 3 de agosto de 2026.

## Estado candidato

`COMUN_RELATA_48_0C_CANDIDATE_LOCAL_GREEN_REMOTE_DB_UNCHANGED`

O tijolo está comprovado somente no laboratório local descartável. Production
permanece dormente, a migration não foi promovida e o Supabase remoto não foi
consultado, migrado ou alterado. O estado terminal será emitido apenas após PR,
checks, Preview, merge e smoke read-only do deployment funcional exato.

## Baseline e entrega

- `repository_main_sha`: `bb2b3cb709a6f3b01c0774175c9c9e9704e81396`;
- `functional_product_sha`: `093f9772d28c018c95d5f8c1aac5afe6c1de30e6`;
- `production_observed_sha`: `093f9772d28c018c95d5f8c1aac5afe6c1de30e6`;
- branch: `codex/tijolo-48-0c-relata-private-evidence-cases`;
- candidata funcional: `ed8c4a5cdb95565f5a5025eaf80c47c23083e797`;
- PR #153: aberta em draft; Preview, merge e Production funcional pendentes;
- migration forward-only:
  `20260803192419_comun_relata_private_evidence_cases.sql`;
- SHA-256: `97be487aa2c03c559aa1918835056aa90cb9dba16288d4396370ac1fc95e9983`;
- manifesto local-only em `supabase/local-releases/`, com
  `requiresPromotion=false` e `remotePromotionAllowed=false`;
- a migration imutável do 48.0B permaneceu byte a byte intacta.

## Barreiras e autorização

As três flags são cumulativas: `COMUN_RELATA_PREVIEW`,
`COMUN_RELATA_LOCAL_PERSISTENCE` e `COMUN_RELATA_LOCAL_EVIDENCE`. O runtime
também exige Supabase HTTP loopback com porta explícita, service role local e
duas chaves distintas de 32 bytes. Flags e loopback são validados antes da
leitura de segredo ou criação de cliente. Com qualquer barreira desligada, a
interface experimental desaparece e as novas APIs respondem `404`.

## Localização privada

- opcional e solicitada somente após gesto em “Usar localização” ou “Marcar no mapa”;
- AES-256-GCM server-side, nonce aleatório, tag autenticada, AAD ligada ao
  protocolo e versão de chave; chave fora do banco, browser, logs e artefatos;
- coordenadas iguais produzem nonce e ciphertext diferentes;
- agrupamento recebe somente HMAC-SHA-256 de células e vizinhas, com chave
  separada; nenhum geohash ou coordenada arredondada persiste em claro;
- origem, classe de precisão, captura, contrato, estado e consentimento
  contextual versionado são registrados;
- a candidata aproximada permanece privada e nenhum registro é inserido em
  `comun_relata_public_snapshots`.

## Fotografias protegidas

- somente JPEG, PNG e WebP; até três fotos, 8 MiB cada e 20 MP decodificados;
- assinatura real por bytes, decodificação segura com `sharp`, rejeição de
  corrupção/dimensão excessiva e SHA-256 privado;
- fluxo em duas fases: quarentena privada, validação, recodificação WebP privada
  sem EXIF/metadados e selagem;
- bucket `comun-relata-private`, `public=false`, zero policy direta para anon ou
  authenticated e nomes opacos sem PII, categoria ou localização;
- leitura por proxy same-origin e prova de recibo a cada acesso; nenhuma URL
  pública ou assinada persistente;
- rótulos somente “Foto 1–3”; nome original, path, hash e dimensões exatas não
  são expostos;
- toda derivada continua `review_required_for_publication=true`; recodificação
  não é afirmação sobre rostos, placas, crianças, documentos ou residências.

## Casos coletivos

`public.comun_relata_cases` continua sendo o processo individual e seu
protocolo COMUN. A camada aditiva usa caso coletivo, participação, chaves de
match privadas e eventos append-only. Há no máximo uma participação coletiva
ativa por processo; correção e desvinculação preservam história.

As regras `relata-match-v1` são determinísticas e configuradas por
categoria, janela temporal, célula HMAC, gravidade, privacidade e emergência.
Iluminação pública, queda de energia e vestígio de fumaça/queimada usam
hipóteses operacionais versionadas, não verdades científicas. Fio caído, risco
elétrico, fogo ativo, emergência e conteúdo sensível usam `never_auto_link` e
não geram chave espacial. Confiança alta vincula automaticamente; média registra
candidato sem bloquear a pessoa; baixa mantém caso individual.

## Retirada, cleanup e recuperação

Retirada revoga acesso pela interface, inativa participação e chaves, recalcula
contagem e registra evento sem apagar história ou bytes. Caso coletivo vazio é
marcado inativo. Cleanup é idempotente, dry-run por padrão, local-only, sem nome
de objeto no artifact e exige confirmação literal para qualquer mutação local.
Não existe delete remoto. Banco e Storage foram restaurados em ensaios locais
sintéticos com checksums e smokes verdes.

## RLS, API e no-leak

- 12 tabelas Relata com RLS habilitada e forçada;
- `PUBLIC`, `anon` e `authenticated`: zero CRUD direto;
- 13 RPCs Relata server-only, `security definer`, `search_path=pg_catalog`,
  EXECUTE somente para `service_role` local;
- 194 tabelas na matriz integral, 2.328 combinações de persona, zero finding,
  zero definer inseguro e zero definer exposto;
- prova ausente, errada ou protocolo inexistente são indistinguíveis;
- respostas nunca contêm coordenada, ciphertext, nonce, tag, hash, HMAC, path,
  original, segredo ou conteúdo de outro relato;
- logging aceita somente operação, estado, versão, quantidade e faixas
  sanitizadas; Production no-leak e UI pública verdes.

## Verificação local

- Relata consolidado: 10 arquivos/32 testes, DB, Storage, cleanup e retenção verdes;
- E2E Relata: 15/15 em 320×568, 390×844, 844×390, 768×1024 e PWA 430×932;
- unitária integral: 91 arquivos/455 testes;
- Security Resilience: 8/8; RLS integral `COMUN_RLS_COMPLETE_GREEN`;
- restauração: `COMUN_DATABASE_RESTORE_REHEARSAL_GREEN` e
  `COMUN_STORAGE_RESTORE_REHEARSAL_GREEN`;
- App Shell V2: 35/35; acessibilidade App Shell: 5/5;
- qualidade: 27/27 a11y, 30/30 PWA, 9/9 performance e 2/2 rede;
- surfaces: 190 páginas, sete shells, zero desconhecida, zero `legacy_rendered`,
  zero P0/P1 e dívida P2/P3 estrutural inalterada em 93;
- typecheck, lint, build, release/checksum, grants, no-leak e UI pública: verdes;
- `npm audit`: quatro vulnerabilidades high preexistentes; nenhuma correção
  automática ou mudança de dependência foi aplicada neste tijolo.

## Production observada antes da integração

- deployment funcional: `dpl_B8Tm8VzZV2SNTECxV9dAuJFHpvEN`, `READY`;
- domínio: `https://comunsocial.online`; PWA: `comun-pwa-v3`;
- `/comun`, App V2 e fallback legado: `200`;
- `/comun/relata` e APIs GET de evidência: `404`;
- nenhum link público, request Relata, envio externo ou snapshot público.

## Limites e próximos gates

Retenção definitiva, revisão visual humana, publicação, encaminhamento,
protocolo oficial, vídeos, áudios, documentos, OCR, reconhecimento, mapa público
e promoção remota continuam fora de escopo. 47.9D não foi iniciado e
`launch_publicly` permanece fechado. O próximo tijolo será definido após o
fechamento integrado do 48.0C.
