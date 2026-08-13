# COMUN 48.3-A1 — Pautas Vivas: núcleo público

**Estado:** Production green

**Baseline:** `0ca8c3805f314e19749bc256b12c280d0d4adc99`

**Branch:** `codex/48-3-a1-pautas-vivas-public-core`

**Data:** 2026-08-13

## Resultado do preflight remoto

O preflight metadata-only foi executado antes da criação da migration no GitHub Actions, run `31716044656`, e emitiu `COMUN_48_3_A1_REMOTE_PREFLIGHT_GREEN`.

- transação: `READ ONLY`;
- cinco tabelas canônicas de pauta auditadas;
- `comun_pauta_spaces` já contém os campos públicos suficientes e não será migrada;
- `comun_pauta_evidence_items` mantém leitura pública somente de itens `approved` e `public_safe` ligados a pauta pública;
- `anon` e `authenticated` não possuem `INSERT`; `service_role` possui;
- as três colunas da citação e `source_type=public_evidence` estavam ausentes;
- nenhuma contribuição, relato, identidade, anexo, localização ou forwarding foi lido.

Contagens agregadas seguras do preflight: uma pauta, zero evidence items, zero contribuições, zero memberships e zero versões de síntese. Nenhum conteúdo foi selecionado.

## Contrato A1

`public.comun_pauta_spaces` permanece a única raiz de Pauta Viva. A migration `20260813124308_comun_pautas_vivas_public_evidence.sql` estende somente `comun_pauta_evidence_items`, sem backfill e sem reescrever linha existente.

Uma citação `PublicEvidenceCitationV1` contém envelope pequeno e allowlisted do Panorama: namespace, referência, versão SHA-256 determinística, origem/metodologia, claim kind, caminho público, período, fontes e limitações. A versão é independente da ordem de `sourceRefs` e muda quando o significado da citação muda. Claims causais, normativos, violação legal, score de risco, caminhos não públicos e marcadores privados falham fechados.

O helper server-side recebe apenas `{ pautaId, refId }`, valida a pauta pública, resolve a referência atual por DTOs públicos, gera o payload no servidor e cria item `approved`, `public_safe`, `dado_agregado`. O índice parcial torna o vínculo idempotente por pauta + ref + versão. Não existe UI pública de attach neste tijolo.

## Experiência pública

`COMUN_PAUTAS_VIVAS_CORE_ENABLED` é fail-closed. OFF preserva as rotas existentes; ON evolui as mesmas `/comun/pautas` e `/comun/pautas/[slug]`, sem criar uma raiz paralela.

A listagem usa atualização pública mais recente, sem popularidade. O detalhe prioriza título, questão, estado, próximo passo e CTA; depois apresenta evidências públicas, atividade/ação, participação e memória. Dossiê aparece como **Síntese editorial**, distinto da pauta. Listas são bounded e não formam feed infinito.

## Gates e rollout

- migration: exatamente uma, forward-only;
- Supabase descartável: linhas legadas válidas, tipos antigos válidos, policy pública preservada, `INSERT` público negado;
- remote plan: exatamente a migration A1, reconciliando somente a exceção externa conhecida de Calçadas;
- promoção: exact-main, postflight metadata-only;
- wave 0: flag disabled e comportamento legado;
- wave 1: somente Pautas Vivas enabled;
- Production: smoke read-only, sem fixture e `businessWrites=0`.

Resultado operacional:

- PR funcional: [#304](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/304);
- head funcional exacto: `3108288abd9f8f87e8181b18f58b77b14cabece9`;
- merge SHA: `39065abd4689c5cd2b1e29184cba0a5bd868e72b`;
- migration promovida: `20260813124308_comun_pautas_vivas_public_evidence.sql`;
- SHA-256 da migration: `b7027078860d9e6385d2fafbe0d5b35abf54ceff725ba04929a55aca198a1aea`;
- flags-off + promoção + postflight: run `31723844180`, verde;
- wave 1: run `31724079385`, verde;
- CI do PR: 884 testes unitários, typecheck, lint, build, acessibilidade, segurança, no-leak, jornadas integrais, Supabase descartável e Preview verdes;
- o único rerun foi de uma falha transitória `502` durante reset local posterior a um ensaio já verde; o rerun isolado concluiu verde sem mudança de código;
- smoke Production: rotas existentes preservadas com a flag OFF; mesmas rotas exibindo Pautas Vivas com a flag ON; `businessWrites=0`.

## Invariantes preservados

- nenhuma tabela-raiz nova;
- Relata privado nunca vira pauta automaticamente;
- fato público não define posição política;
- pauta, evidência, contribuição, ação, comunidade e síntese editorial permanecem objetos distintos;
- nenhum snapshot integral é copiado;
- nenhuma nova comunidade, roda, sistema de ação, IA ou publicação automática;
- piloto Motorola permanece pausado e `launch_publicly=false`.

Estado terminal:

`COMUN_48_3_A1_PAUTAS_VIVAS_PUBLIC_CORE_GREEN_VERSIONED_EVIDENCE`.
