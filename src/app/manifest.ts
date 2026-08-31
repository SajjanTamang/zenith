import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zenith Finance",
    short_name: "Zenith",

    description:
      "Personal finance, game P&L and lending tracker.",

    start_url: "/dashboard",
    scope: "/",

    display: "standalone",

    background_color: "#131313",
    theme_color: "#131313",

    orientation: "portrait",

    categories: [
      "finance",
      "productivity",
    ],

    icons: [
      {
        src: "/zenith-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/zenith-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/zenith-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}