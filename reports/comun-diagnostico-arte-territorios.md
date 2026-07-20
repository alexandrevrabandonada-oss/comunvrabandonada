# Diagnóstico — Arte dos Territórios

Data: 2026-07-15  
Modo: local-first, checkout Supabase desligado do projeto remoto.

## Estruturas reutilizáveis

- `comun_archive_items` permanece a raiz de toda obra; receberá somente o novo `item_type = territorial_artwork`.
- `comun_archive_assets` já separa `private_original` e `public_safe`, guarda checksum, MIME, dimensões, revisão e chave de objeto. Os novos papéis de arte devem ampliar o catálogo existente, não criar outra tabela de arquivos.
- `comun_archive_collections` e `comun_archive_collection_items` atendem à curadoria finita sem alterar direitos.
- `comun_archive_relations` atende às relações entre itens do Acervo. Relações com pauta/território/projeto exigem uma tabela tipada de alvos externos, pois a tabela atual só aceita dois archive items.
- `comun_archive_processing_jobs`, attempts e events formam a fila idempotente reaproveitável; o worker de fotografias fornece validação e geração local de WebP como base.
- `comun_archive_rights_removal_requests`, sugestões, alertas e auditoria administrativa podem ser reutilizados e especializados por novos tipos.
- `comun_member_profiles` e a sessão comunitária identificam o remetente, sem expor `user_id` no HTML.
- `comun_pauta_spaces`, módulos e Minha Participação são os pontos de integração, sem duplicar obras dentro de pautas.

## Estruturas que seriam duplicação

- Nova raiz de obra, tabela paralela de assets, coleção exclusiva de arte, fila exclusiva ou tabela paralela de pauta não devem ser criadas.
- `comun_archive_artist_profiles` não deve ser copiada para artes visuais: ela modela nome artístico, formação musical, gêneros, lançamentos e integrantes.
- `comun_member_profiles` não deve virar cadastro público de artista: é identidade de autenticação e privacidade da conta.

## Decisão sobre criadores

Não existe entidade genérica suficiente. Criar `comun_archive_agents` para pessoa, coletivo, organização, comunidade tradicional, autoria anônima ou desconhecida. O vínculo opcional com membro é privado e serve a reivindicação/correção; contato e notas permanecem server-only.

Um agente pode receber créditos em várias linguagens. Artistas musicais existentes não serão migrados automaticamente. A convergência será gradual por relação editorial explícita entre um agent e um archive item de tipo `artist`, evitando fusões equivocadas e preservando URLs.

## Obra, direitos e menores

- Especializar a raiz em `comun_archive_artworks` e múltiplos créditos em `comun_archive_artwork_credits`.
- Criar direitos granulares de arte porque o `rights_status` da raiz não expressa preservação, exibição, rede social, impressão, exposição, educação, campanha, crop, derivadas, download e retirada separadamente.
- Criar revisão privada de sensibilidade/menores sem idade pública, escola, rotina, contato ou localização precisa.
- Publicação deve falhar fechada sem crédito, contexto, território/justificativa, original privado, derivada aprovada e `allow_comun_display=true` dentro da validade.

## Compatibilidade futura com Rádio COMUN

Agents e créditos são agnósticos de linguagem. Obras continuam como archive items e podem receber a relação `artwork_future_radio_feature`; a rádio futura referencia o mesmo item/agente, sem copiar perfil, arquivo ou direitos.

## Conclusão

O desenho reutiliza a fundação do Acervo e adiciona apenas especializações necessárias: agents, artwork, credits, rights, revisão privada, contribuições e relações tipadas. Nenhuma migration remota, storage remoto ou importação de terceiros é necessária.
