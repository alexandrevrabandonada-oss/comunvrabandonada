# Janela de observação da expiração no ensaio de Storage

No #523, candidato `df98a5f8`, Security job `113505674820` passou no restore de banco e falhou no ensaio sintético de Storage com `COMUN_STORAGE_SIGNED_URL_NOT_ACTIVE`. Os links tinham TTL de um segundo; a falha ocorreu antes da observação de expiração. A duração exata da requisição não foi capturada. Latência consumindo a janela é uma hipótese, não uma causa comprovada do incidente.

O ensaio passa a assinar o objeto sintético por 15 segundos, exigir HTTP 200 e então aguardar mais 17 segundos antes de exigir que a mesma URL deixe de responder 200. Continua falhando se o link já estiver inativo, permanecer acessível, não puder ser assinado ou houver erro de rede. Usa o mesmo contrato para Supabase local e R2; o tempo dos links do aplicativo não muda.

Testes com relógio simulado exercitam latência de dois segundos, identidade da URL, observação após expiração e os negativos. A prova real de perda/restore e limpeza precisa passar no CI do novo SHA. Não substitui backup durável, recuperação do provedor ou ensaio real de desastre. Não há mudança de migration, política, permissão ou flags.

A base `1e6602c` já confirmou Quality remoto e PWA → miniapp em CI; o candidato `df98a5f8` passou na prova focal própria do miniapp. Seus seis gates remotos da Escola e a falha de Storage permanecem no histórico. A conexão Supabase disponível não autoriza acesso direto ao projeto COMUN; o baseline completo da Escola ainda precisa de caminho autorizado.

A falha pós-merge #528 foi causada pelo #529 ficar READY antes do preflight do SHA anterior. Nos próximos merges que exigem build, aguardar o SHA servido e o Quality pós-merge da base antes do próximo deploy. As falhas antigas não se tornam PASS pela aprovação de outra base.
