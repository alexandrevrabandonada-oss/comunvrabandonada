# Scheduler do Acervo

GitHub Actions chama o endpoint POST protegido a cada 15 minutos. Secrets `ARCHIVE_PROCESSING_ENDPOINT` e `ARCHIVE_PROCESSING_CRON_SECRET` ficam no GitHub; o mesmo token sensível fica na Vercel. Há concurrency, timeout de dois minutos e uma repetição HTTP. Desative removendo o schedule; rotacione atualizando ambos os providers. O botão admin permanece fallback.
