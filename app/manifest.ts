import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/comun/",
    name: "COMUN VR Abandonada",
    short_name: "COMUN",
    description: "Território, comunidade, pauta, ação, resultado e memória em Volta Redonda.",
    start_url: "/comun",
    scope: "/comun/",
    display: "standalone",
    background_color: "#0b0b0a",
    theme_color: "#0b0b0a",
    orientation: "any",
    icons: [
      { src: "/icons/comun-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/comun-512.svg", sizes: "512x512", type: "image/svg+xml" },
      { src: "/icons/comun-maskable.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Participar", short_name: "Participar", url: "/comun/participar" },
      { name: "Territórios", short_name: "Territórios", url: "/comun/territorios" },
      { name: "Comunidades", short_name: "Comunidades", url: "/comun/comunidades" },
      { name: "Minha área", short_name: "Minha área", url: "/comun/minha-participacao" },
    ],
  };
}
