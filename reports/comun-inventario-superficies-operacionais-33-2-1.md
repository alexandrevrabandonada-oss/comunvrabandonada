# Inventário de superfícies operacionais — Sprint 33.2.1

Todas usam fixture `fixture-s33-2-1`, autorização server-side e navegador real. Central e detalhe têm cinco viewports; as demais, 360×800 e 1366×768.

| Superfície | Rota | Persona mínima | Ação/estado | E2E | Axe | Visual |
|---|---|---|---|---|---|---|
| central | `/comun/admin/operacao` | operations_admin | abrir filas | completo | 5 viewports | 5 viewports |
| detalhe | `/comun/admin/operacao/[id]` | operations_admin | examinar item | completo | 5 viewports | 5 viewports |
| fila | `/comun/admin/operacao/superficies/queue` | contribution_reviewer | abrir próximo | completo | mobile/desktop | mobile/desktop |
| atribuição / reatribuição | `.../assignment`, `.../reassignment` | operations_admin | confirmar responsável | completo | mobile/desktop | mobile/desktop |
| privacidade | `.../privacy` | privacy_reviewer | aprovar sem imagem | completo | mobile/desktop | mobile/desktop |
| mídia | `.../media` | image_reviewer | bloquear imagem | completo | mobile/desktop | mobile/desktop |
| direitos Arte / Rádio | `.../art-rights`, `.../radio-rights` | rights_reviewer | aprovar/bloquear | completo | mobile/desktop | mobile/desktop |
| roda / síntese | `.../circle`, `.../synthesis` | facilitator | abrir/publicar | completo | mobile/desktop | mobile/desktop |
| protocolo / resposta | `.../protocol`, `.../response` | protocol_operator | registrar fixture | completo | mobile/desktop | mobile/desktop |
| resultado | `.../result` | result_editor | atualizar continuidade | completo | mobile/desktop | mobile/desktop |
| correção / retirada | `.../correction`, `.../withdrawal` | operations_admin | revisar/conter | completo | mobile/desktop | mobile/desktop |
| incidentes / auditoria | `.../incidents`, `.../audit` | operations_admin | assumir/paginar | completo | mobile/desktop | mobile/desktop |
| erro / vazio / expirada | `.../error`, `.../empty`, `.../expired` | papel mínimo do estado | recuperação segura | completo | mobile/desktop | mobile/desktop |

Negações no navegador: oito combinações cruzadas, participante e visitante; nenhuma renderização parcial do conteúdo protegido. Total inventariado: 21 estados/superfícies (19 rotas especializadas mais central e detalhe).

