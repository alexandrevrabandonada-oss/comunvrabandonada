import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/comun/",
    name: "COMUN VR Abandonada",
    short_name: "COMUN",
    description:
      "Território, comunidade, pauta, ação, resultado e memória em Volta Redonda.",
    start_url: "/comun",
    scope: "/comun/",
    display: "standalone",
    background_color: "#0b0b0a",
    theme_color: "#0b0b0a",
    orientation: "any",
    icons: [
      { src: "/icons/comun-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/comun-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/comun-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Participar",
        short_name: "Participar",
        url: "/comun/participar",
      },
      {
        name: "Territórios",
        short_name: "Territórios",
        url: "/comun/territorios",
      },
      {
        name: "Comunidades",
        short_name: "Comunidades",
        url: "/comun/comunidades",
      },
      {
        name: "Minha área",
        short_name: "Minha área",
        url: "/comun/minha-participacao",
      },
    ],
  };
}
