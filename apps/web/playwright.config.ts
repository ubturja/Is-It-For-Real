import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";
import { WebSocket as WsWebSocket } from "ws";

loadEnvConfig(process.cwd());

// supabase-js requires a global WebSocket. Node 20 (and some CI images)
// do not provide one; `ws` fills the gap for Playwright's Node process.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WsWebSocket as unknown as typeof globalThis.WebSocket;
}

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

function isLocalBaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return true;
  }
}

/**
 * Crisis Mode e2e runs against a production server so Serwist is enabled
 * (SW is disabled in `next dev`). Set PLAYWRIGHT_BASE_URL to a remote
 * origin (e.g. the Vercel URL) to skip the local webServer.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
    // Fresh context per test — no cookies / storage carried over.
    storageState: { cookies: [], origins: [] },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: isLocalBaseUrl(BASE_URL)
    ? {
        command: `pnpm start -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
