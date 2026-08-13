import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HealthResponseSchema } from "@isitfr/schemas";

/**
 * Parked alternative API surface (Hono).
 * Not wired into apps/web — keep as a standalone import of shared packages.
 */
const app = new Hono();

app.get("/health", (c) => {
  const body = HealthResponseSchema.parse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  return c.json(body);
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.log(`@isitfr/edge-api listening on http://localhost:${port}`);
});

export default app;
