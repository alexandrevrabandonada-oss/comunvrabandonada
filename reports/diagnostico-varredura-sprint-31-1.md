# Relatório de Varredura de Testes (Sprint 31.1)

Varredura realizada no projeto `comun-vr-abandonada` para detectar referências obsoletas ou asserções frágeis.

## Ocorrências Encontradas e Decisões

1. **`community_radio_future` e `art_gallery_future`**:
   - **Ocorrências**: Apenas em arquivos históricos de migração SQL (`20260715032613_comun_pauta_miniapps_circles.sql` e `20260715170058_comun_territorial_art_foundation.sql`).
   - **Decisão**: Mantidos apenas no histórico de migrações SQL (onde são corrigidos para os tipos novos em migrações posteriores). Totalmente ausentes das asserções ativas do catálogo, tipos de dados, código-fonte e fixtures. O novo teste unitário do catálogo agora valida ativamente a ausência destes tipos antigos.

2. **Leitura de código-fonte em testes buscando literais / dependência de aspas / formatação**:
   - **Ocorrências**: Ocorria no teste legado `smoke-comun-pauta-miniapp.mjs`.
   - **Decisão**: O script foi completamente reescrito para testar a integração funcional real através do Supabase JS e requisições HTTP, removendo todas as dependências de aspas simples, aspas duplas, ordem das chaves, ou busca de strings no código-fonte. Não existem outros testes na suíte realizando varreduras frágeis desse tipo.

3. **`NEXT_PUBLIC_SITE_URL` remoto**:
   - **Ocorrências**: Identificado no `.env.example` e em arquivos de documentação/histórico de relatórios antigos.
   - **Decisão**: O código-fonte principal (`actions.ts` e `[slug]/page.tsx`) usa `http://localhost:3000` como fallback padrão de `process.env.NEXT_PUBLIC_SITE_URL`. O ambiente de testes locais injeta `http://localhost:3000` via script de loader. Não há perigo de vazamento ou requisição de host remoto durante os testes locais do Release Candidate.
