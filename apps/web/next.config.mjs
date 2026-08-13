import withSerwistInit from "@serwist/next";
import {
  copyCrisisContentToPublic,
  crisisPrecacheEntries,
  crisisShellRevision,
} from "./scripts/crisis-offline-content.mjs";

copyCrisisContentToPublic();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Explicit /content JSON URLs — do not rely on webpack incidentally
  // bundling flow/templates/resources into a JS chunk.
  additionalPrecacheEntries: [
    { url: "/help", revision: crisisShellRevision() },
    { url: "/manifest.json", revision: "1" },
    ...crisisPrecacheEntries(),
  ],
  // Keep /train (and API) out of the precache list — Crisis Mode only.
  exclude: [/\/api\//i, /\/\(train\)\//i, /\/train/i],
  manifestTransforms: [
    async (entries) => ({
      manifest: entries.filter((entry) => {
        const url = typeof entry === "string" ? entry : entry.url;
        return (
          !url.includes("/(train)/") &&
          !url.includes("/train/") &&
          url !== "/train" &&
          !url.startsWith("/api/")
        );
      }),
      warnings: [],
    }),
  ],
  // Do not auto-cache navigations (would pull /train into the SW cache).
  cacheOnNavigation: false,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@isitfr/schemas",
    "@isitfr/engine",
    "@isitfr/content-config",
  ],
  webpack: (config) => {
    // Vite's import.meta.glob is a compile-time call; webpack falls through
    // to require.context. Ignore the resulting import.meta warning.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /content-config[/\\]src[/\\]loadFlows\.ts$/,
        message: /Critical dependency: Accessing import\.meta directly/,
      },
    ];
    return config;
  },
};

export default withSerwist(nextConfig);
