/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isTrainPath(pathname: string): boolean {
  return pathname === "/train" || pathname.startsWith("/train/");
}

/**
 * Crisis Mode offline only. Register NetworkOnly for /train and /api first so
 * they never enter CacheFirst / NetworkFirst caches from defaultCache.
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url: { pathname }, sameOrigin }) =>
      sameOrigin && isApiPath(pathname),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url: { pathname }, sameOrigin }) =>
      sameOrigin && isTrainPath(pathname),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        // Uncached documents fall back to Crisis Mode (the offline guarantee).
        url: "/help",
        matcher({ request }) {
          if (request.destination !== "document") {
            return false;
          }
          const path = new URL(request.url).pathname;
          if (isApiPath(path) || isTrainPath(path)) {
            return false;
          }
          return true;
        },
      },
    ],
  },
});

serwist.addEventListeners();
