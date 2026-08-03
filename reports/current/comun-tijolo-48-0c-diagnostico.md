# COMUN — Tijolo 48.0C — diagnóstico

Data: 2026-08-03
Escopo: localização privada, fotografias protegidas e casos coletivos, somente em Supabase descartável/local.

## Baseline resolvido

- `repository_main_sha`: `bb2b3cb709a6f3b01c0774175c9c9e9704e81396`;
- `functional_product_sha`: `093f9772d28c018c95d5f8c1aac5afe6c1de30e6`;
- `production_observed_sha`: `093f9772d28c018c95d5f8c1aac5afe6c1de30e6`;
- `origin/main` coincide com o merge documental informado e é descendente forward-only da fundação 48.0B;
- Production: `/comun`, App V2 e fallback legado em `200`; `/comun/relata` em `404`;
- o deployment documental cancelado não substituiu o deployment funcional `dpl_B8Tm8VzZV2SNTECxV9dAuJFHpvEN`;
- branch isolada: `codex/tijolo-48-0c-relata-private-evidence-cases`;
- Supabase remoto não foi consultado.

## Inventário obrigatório

1. **Migration 48.0B** — `20260803161310_comun_relata_durable_local.sql` é imutável, forward-only e possui checksum validado. Cria relatório privado, processo individual, consentimento, eventos append-only, localização bloqueada e snapshot público estruturalmente bloqueado.
2. **Manifesto 48.0B** — `requiresPromotion=false`, `remotePromotionAllowed=false` e escopo `disposable_local_supabase_only`. Não integra allowlist remota.
3. **Separação física** — texto, provas em hash e localização ficam em `private`; protocolo, estado e timeline ficam em `public` sem grants de cliente.
4. **RPCs existentes** — `create`, `get_receipt` e `withdraw` são `security definer`, `search_path=pg_catalog` e executáveis apenas por `service_role` local server-side.
5. **Recibo** — protocolo e segredo ficam em cookie HttpOnly, `SameSite=Strict`, `Secure` sob HTTPS e path `/api/comun/relata`; protocolo isolado não autoriza leitura.
6. **Calçadas** — há upload privado em duas fases, confirmação idempotente, compensação de falhas e cleanup. O contrato não será copiado integralmente porque aceita 30 MB/80 MP, persiste nome original e possui caminhos futuros de publicação.
7. **Storage existente** — buckets privados são acessados pelo backend com `service_role`; o novo escopo exige bucket exclusivo, `public=false`, sem policies para `anon` ou `authenticated`.
8. **Imagem** — `sharp@0.35.3` está fixado no lockfile e decodifica JPEG/PNG/WebP com limite de pixels. É adequado para validar bytes reais, rejeitar corrupção e recodificar WebP sem EXIF.
9. **Assinaturas** — a rotina de Calçadas valida magic bytes, mas infere MIME pela extensão. O Relata deverá detectar o formato exclusivamente pelos bytes e ignorar nome/MIME declarados para a decisão final.
10. **PostGIS** — o repositório possui geometria territorial, porém o 48.0C não precisa persistir `geometry`/`geography`: coordenadas exatas serão AES-256-GCM e o agrupamento usará somente HMACs de células produzidos no servidor.
11. **Mapas** — `SidewalkRealPointPicker` já oferece seleção por toque e teclado sobre PMTiles locais. Pode ser reutilizado sem expor coordenada na interface ou introduzir mapa público.
12. **Geolocalização** — os fluxos atuais chamam `getCurrentPosition` após ação explícita. O Relata manterá essa solicitação sob gesto e oferecerá pular.
13. **Restore** — o ensaio de banco inclui `public`, `private` e migrations. O ensaio de Storage cobre objetos privados, mas precisará incluir o bucket Relata e provar original/derivada privada.
14. **RLS** — a matriz integral já exige RLS habilitada e forçada, ausência de grants e RPCs server-only; novas tabelas e funções precisam entrar no mesmo inventário.
15. **No-leak** — o smoke HTTP e a telemetria sanitizada já proíbem segredo/cookie. O 48.0C deve acrescentar coordenada, acurácia exata, ciphertext, nonce, HMAC, hash, object path, nome de arquivo e signed URL.
16. **Surfaces** — `/comun/relata` é rota imersiva/dormente e não aparece na navegação. A seção Evidências só poderá renderizar com as três flags locais.
17. **Logs** — as APIs 48.0B não imprimem payload. Novas rotas deverão devolver códigos sanitizados e não registrar dados privados.
18. **Parciais** — Calçadas registra tickets e compensa objetos/registros. O Relata adotará estados `quarantine`, `validating`, `sealed_private`, `rejected`, `orphaned`, `withdrawn` e cleanup dry-run idempotente.
19. **Payload/runtime** — fotografias de 8 MB excedem limites comuns de Functions hospedadas. Como o recurso é local-only e Production retorna `404` antes de cliente/segredo, será usado proxy Node same-origin apenas local; nenhum contrato hospedado será alegado.
20. **Retirada** — hoje a retirada muda processo/relato e adiciona evento. O 48.0C deverá também revogar leitura pela interface, inativar membership, recalcular caso coletivo e marcar evidências, sem apagar bytes ou história.

## Decisão de arquitetura

- Terceira barreira: `COMUN_RELATA_LOCAL_EVIDENCE=enabled`, além das duas flags existentes, destino loopback e duas chaves locais distintas.
- AES-256-GCM server-side com nonce único, AAD vinculada ao relato e versão de chave; HMAC-SHA-256 independente para células espaciais.
- API same-origin como única superfície do navegador; nenhum cliente Supabase, segredo, path ou signed URL no client.
- Upload em duas fases: ticket privado e envio ao proxy; o servidor grava quarentena local, valida/decodifica, recodifica derivada privada e compensa falhas.
- Camada coletiva aditiva: processo individual e protocolo permanecem intactos; membership preserva histórico e limita uma participação ativa.
- Regras determinísticas versionadas, sem texto, LLM, embeddings ou coordenadas no banco.

## Hipóteses e riscos abertos

- As janelas e escalas espaciais serão hipóteses operacionais `relata-match-v1`, não verdades científicas.
- Imagem recodificada continua privada e `review_required_for_publication=true`; remoção de metadados não comprova ausência de rosto, placa ou residência.
- Retenção e remoção definitiva permanecem sem política de Production; cleanup será dry-run por padrão e mutável somente em loopback explicitamente habilitado.
- As quatro vulnerabilidades npm de severidade alta observadas por `npm ci` são dívida de dependências preexistente; nenhuma atualização automática será misturada ao tijolo.

## Gate do diagnóstico

`COMUN_RELATA_48_0C_DIAGNOSIS_READY_LOCAL_ONLY`
