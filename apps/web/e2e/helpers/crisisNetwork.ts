import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Page, Request } from "@playwright/test";

type ResourceFile = {
  resources: { url: string }[];
};

const resourcesPath = join(
  process.cwd(),
  "../../packages/content-config/src/resources/crisis-deepfake-classmate.json",
);

const crisisResourceFile = JSON.parse(
  readFileSync(resourcesPath, "utf8"),
) as ResourceFile;

/** Destinations of Crisis Mode "Open" resource links — from content-config. */
export function crisisResourceUrls(): string[] {
  return crisisResourceFile.resources.map((resource) => resource.url);
}

function pathnameOf(urlString: string): string | null {
  try {
    return new URL(urlString).pathname;
  } catch {
    return null;
  }
}

/**
 * Same-origin page/JS/CSS/SW/content-precache traffic from the first /help load.
 * Application XHR/fetch (e.g. /api/*) is not included.
 */
export function isCrisisShellAssetRequest(request: Request): boolean {
  if (request.serviceWorker()) {
    return true;
  }

  const pathname = pathnameOf(request.url());
  if (pathname === null) {
    return false;
  }

  if (request.method() !== "GET" && request.method() !== "HEAD") {
    return false;
  }

  return (
    pathname === "/help" ||
    pathname.startsWith("/help/") ||
    pathname === "/sw.js" ||
    pathname.startsWith("/swe-worker") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/content/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico"
  );
}

export function isExplicitResourceNavigation(request: Request): boolean {
  if (!request.isNavigationRequest()) {
    return false;
  }
  const url = request.url();
  return crisisResourceUrls().some(
    (allowed) => url === allowed || url.startsWith(allowed),
  );
}

export function isTrackedXhrOrFetch(request: Request): boolean {
  const type = request.resourceType();
  return type === "xhr" || type === "fetch";
}

export function isUnexpectedCrisisXhrOrFetch(request: Request): boolean {
  if (!isTrackedXhrOrFetch(request)) {
    return false;
  }
  if (isCrisisShellAssetRequest(request)) {
    return false;
  }
  if (isExplicitResourceNavigation(request)) {
    return false;
  }
  return true;
}

export function formatRequest(request: Request): string {
  return `${request.method()} ${request.resourceType()} ${request.url()}`;
}

/**
 * Record xhr/fetch for a full online /help run. Shell load and "Open resource"
 * navigations are kept on the log but not treated as unexpected.
 */
export function attachCrisisNetworkLog(page: Page): {
  unexpected: () => string[];
  tracked: () => string[];
} {
  const unexpected: string[] = [];
  const tracked: string[] = [];

  page.on("request", (request) => {
    if (!isTrackedXhrOrFetch(request)) {
      return;
    }
    const line = formatRequest(request);
    tracked.push(line);
    if (isUnexpectedCrisisXhrOrFetch(request)) {
      unexpected.push(line);
    }
  });

  return {
    unexpected: () => [...unexpected],
    tracked: () => [...tracked],
  };
}
