# Tijolo 42.1 — correção da pauta canônica

Atualizado em 24 de julho de 2026.

## Causa observada

O shell do Mapa das Calçadas publicava o link
`/comun/pautas/calcadas-em-circulacao`, mas a página dependia exclusivamente de
uma linha pública no Supabase. Na ausência dessa entidade pública, a rota caía
na página legada e terminava em 404.

## Correção

Foi criado um fallback editorial explícito em
`lib/comun/canonical-editorial-pautas.ts`:

- identificador local: `editorial:calcadas-em-circulacao`;
- origem interna: `editorial_fallback`;
- título: “Calçadas em circulação”;
- comunidade editorial: “Mobilidade e Acessibilidade”;
- métricas zeradas;
- nenhuma data, pessoa, protocolo, resultado ou participação inventada.

A página usa o `PautaAppShell` e mantém as seis fases:

- Entenda;
- Converse;
- Contribua;
- Construa;
- Acompanhe;
- Memória.

O aviso público informa que a pauta-piloto editorial está em construção e que
registros e resultados aparecem somente após verificação e publicação.

## Precedência

1. registro público real do Supabase;
2. fallback editorial somente após consulta bem-sucedida com zero linhas;
3. 404 para slug desconhecido, privado ou arquivado.

Falha de banco não ativa o fallback. A listagem também usa a inspeção completa
do slug para não duplicar ou revelar uma pauta privada/arquivada.

## Limites

- nenhuma migration;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração de workflow ou domínio;
- nenhuma fixture remota;
- gate humano: 0/3;
- piloto público: fechado;
- Tijolo 43: não iniciado.
