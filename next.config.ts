import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static files only, so the site can live on GitHub Pages: every page is
  // prerendered to HTML and all booking data stays in the browser.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
