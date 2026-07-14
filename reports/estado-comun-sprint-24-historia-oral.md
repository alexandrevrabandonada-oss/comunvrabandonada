# Estado do COMUN — Sprint 24: História Oral

Data: 14/07/2026

## Implementação

- Modelagem: `comun_archive_items` permanece entidade principal com `item_type=oral_history`; tabelas privadas especializam entrevistas, participantes, consentimentos, transcrições, segmentos, sugestões, retiradas e histórico editorial.
- Participantes: papéis, identificação pública preferida, nome/contato privados, condição de menor e retirada separados.
- Consentimento: granular por participante, parcial e temporal, com autorizações independentes para preservação, transcrição, texto, áudio, imagem, nome, usos e download. Termo referencia apenas asset privado.
- Storage: original de áudio, termo e fonte de transcrição usam `private_original`; upload direto ao R2 aceita cinco MIME de áudio e até 500 MB. Vídeo permanece bloqueado.
- Transcrição: versões imutáveis internas e públicas; `internal_full` nunca é consultada pela rota pública. Provider manual implementa a interface preparada para assistência futura.
- Segmentos: marcações temporais, sensibilidade e estado de publicação; somente `approved_public` é selecionado publicamente.
- Publicação: gate fechado exige workflow aprovado, consentimento válido, versão pública aprovada, revisão dos trechos sensíveis, embargo encerrado e autorização específica de áudio/menores.
- Áudio público: arquivo separado, aprovado e consentido; player sem autoplay, com preload de metadados, fallback textual e preferência de download.
- Embargo e retirada: leitura dinâmica oculta entrevista, transcrição e áudio. Retirada despublica item, arquiva assets públicos e preserva histórico privado sanitizado.
- Menores: autorização de responsável obrigatória, identidade mínima e alerta crítico quando revisão está incompleta.
- Busca: título, resumo, cidade e bairro públicos; transcrição interna e campos privados não entram no índice público.
- Coleções e relações: reutilizam a fundação do Acervo; relações de lugares, eventos, artistas, fotos, documentos, pautas e dossiês foram adicionadas sem remover relações musicais existentes.
- Alertas: consentimento pendente/expirando/expirado, transcrição, segmento sensível, embargo, retirada, asset sem consentimento e menor; deduplicação e resolução automáticas pelo worker já saudável.
- Auditoria: eventos administrativos sanitizados; snapshots removem contatos, nomes privados, termos, notas integrais, chaves e URLs.

## Segurança e RLS

Todas as oito tabelas novas têm RLS habilitada, grants `anon/authenticated` revogados e acesso por `service_role` server-only. A página pública usa selects explícitos e sanitizados. Original, termo, nome privado, contatos, localização privada, transcrição interna, notas, object keys e URLs assinadas ficam fora do HTML.

## Verificação

- Supabase local foi reconstruído com todas as migrations; `RLS_MATRIX_OK` e lint do banco sem erros.
- Migration remota aplicada com sucesso.
- ESLint, TypeScript, 57 testes unitários e build Next.js passaram.
- Testes públicos Playwright/axe de História Oral passaram em 360, 390, 768 e 1366 px durante a implementação; o fechamento completo é registrado após o gate de produção.

## Custos, riscos e próximo tijolo

Sem fornecedor de transcrição e sem serviço pago novo. O custo incremental é storage R2 dos originais, tráfego dos áudios públicos autorizados e queries administrativas. Riscos principais: consentimento temporal, alegações envolvendo terceiros e decisões de preservação após retirada; todos permanecem sob revisão humana.

Próximo tijolo recomendado: piloto editorial com poucas entrevistas consentidas, revisão jurídica do termo e, somente depois, avaliação de transcrição assistida opt-in.
