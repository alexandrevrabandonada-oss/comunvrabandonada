# Backup do piloto

Para cada original: upload no escopo privado, HEAD/tamanho, checksum SHA-256, cópia secundária fora do Git e evento `backup_confirmed`. A trilha guarda apenas tamanho, presença de checksum e observação sanitizada — nunca object key, URL ou localização. Original não possui URL pública. O custodiante verifica a restauração segundo a política organizacional antes de marcar o gate humano.
