import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type JsonInit = {
  status?: number;
  headers?: HeadersInit;
};

/** Typed JSON success response — use for every successful route handler. */
export function jsonSuccess<T>(data: T, init: JsonInit = {}): NextResponse<T> {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

/** Typed JSON error response — use for every failed route handler. */
export function jsonError(
  error: { code: string; message: string; details?: unknown },
  status = 400,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}
