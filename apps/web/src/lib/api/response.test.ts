import { describe, expect, it } from "vitest";
import { jsonError, jsonSuccess } from "./response";

describe("jsonSuccess", () => {
  it("returns JSON with default 200 status", async () => {
    const payload = { status: "ok" as const, timestamp: "2026-08-12T14:27:00.000Z" };
    const response = jsonSuccess(payload);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual(payload);
  });

  it("honors an explicit status code", async () => {
    const response = jsonSuccess({ id: "1" }, { status: 201 });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "1" });
  });
});

describe("jsonError", () => {
  it("returns a consistent error envelope", async () => {
    const response = jsonError(
      { code: "bad_request", message: "Invalid input" },
      400,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "bad_request",
        message: "Invalid input",
      },
    });
  });

  it("includes optional details when provided", async () => {
    const response = jsonError(
      {
        code: "validation_failed",
        message: "Schema mismatch",
        details: [{ path: "timestamp", message: "Required" }],
      },
      422,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "validation_failed",
        message: "Schema mismatch",
        details: [{ path: "timestamp", message: "Required" }],
      },
    });
  });

  it("forwards optional headers such as Retry-After", () => {
    const response = jsonError(
      { code: "rate_limited", message: "Too many requests" },
      429,
      { "Retry-After": "60" },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
