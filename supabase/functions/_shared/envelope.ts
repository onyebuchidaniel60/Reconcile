// Stable error envelope per ARCHITECTURE.md §8.
// Imports only the pure CORS helper: usable in Edge Functions, the app,
// and unit tests.
import { corsHeaders } from "./cors.ts";

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId: string;
  };
}

export function err(
  code: string,
  message: string,
  retryable: boolean,
): ErrorEnvelope {
  return {
    error: { code, message, retryable, requestId: crypto.randomUUID() },
  };
}

export function errResponse(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
): Response {
  return Response.json(err(code, message, retryable), {
    status,
    headers: corsHeaders(),
  });
}
