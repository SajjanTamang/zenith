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

    icons: [
      {
        src: "/zenith-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/zenith-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}