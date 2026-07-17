# Backup e restore operacional local

O procedimento exige `COMUN_LOCAL_ONLY=1`, produz inventário, contagem e SHA-256, e rejeita restore se formato, contagem ou checksum divergirem. O restore desta sprint é um dry-run em base descartável: não altera banco remoto nem dados reais. Arquivos gerados são temporários, ignorados e removidos após o teste.
