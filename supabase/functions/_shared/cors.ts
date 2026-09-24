// Shared CORS helpers for Edge Functions (Deno).
// Browsers preflight supabase-js calls with `authorization, apikey,
// content-type, x-client-info` headers; every response (including errors)
// must answer them or the browser blocks the call entirely.
// Pure (no imports): safe for unit tests.
export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders() });
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders() });
}
