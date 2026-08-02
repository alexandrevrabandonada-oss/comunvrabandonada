# Onda 1 — ledger de fidelidade visual

Base conceitual aceita: `reports/assets/47.9a4/concept-pauta-detail.png`.

Captura implementada: `reports/47.9a5/wave1-home-mobile.png`, viewport 390 × 844, rota `/comun?experiencia=app-v2`.

## Correspondências

- preto, amarelo e papel permanecem como identidade principal;
- app bar é compacta e contextual, sem repetir um hero editorial;
- próxima ação domina o primeiro viewport;
- formas funcionais usam tokens semânticos, não raios arbitrários;
- navegação inferior mantém cinco destinos, rótulos e estado ativo;
- nenhum rodapé institucional aparece sob o modo de membro mobile.

## Diferenças intencionais

- a Home usa superfície papel clara porque é `member_root`; o conceito de pauta usa base escura porque é uma entidade `member_nested`;
- a Home não exibe trilha relacional: não existe entidade canônica única no root;
- a captura usa dados públicos/estado vazio real e não fabrica atividade.

## Achado não bloqueante

- o aviso transitório de conexão aparece no topo durante a captura automatizada. Ele é `role=status`, desaparece após reconexão e não encobre ação ou navegação. Reavaliar duração no ensaio 47.9D.
