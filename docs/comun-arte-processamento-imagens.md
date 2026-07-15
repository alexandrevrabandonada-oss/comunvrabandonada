# Processamento de imagens de arte

O gate principal lê o original do Supabase Storage local e escreve WebPs no bucket de derivadas somente após direito de exibição.

Entrada: JPEG, PNG ou WebP, até 30 MB e 80 MP; magic bytes, dimensões e animação devem ser validados. SVG, HTML, executáveis e PDF público são bloqueados.

O original é privado. Derivadas WebP: thumbnail até 400 px, card até 960 px e detail até 2000 px, sem ampliar, sem EXIF/GPS e sem corte destrutivo. Social preview depende de autorização explícita. Assinatura, cores e conteúdo não podem ser alterados.
