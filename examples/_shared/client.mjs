// Shared helper used by every example in this repo.
//
// This repo is deliberately dependency-free so the examples run on a stock
// Node.js (>= 18, which ships a global `fetch`). If and when you adopt the
// official TypeScript client, the package name is `@ticketwave/sdk` and the
// call becomes roughly:
//
//   import { TicketWave } from "@ticketwave/sdk";
//   const tw = new TicketWave({ apiKey: process.env.TICKETWAVE_API_KEY });
//   const events = await tw.events.list();
//
// We do not install that package here on purpose: these files should stay
// runnable with zero `npm install`, and they double as a reference for the
// exact wire shapes the SDK wraps. Every request below is one plain HTTP call
// against the surface described in the OpenAPI spec:
//   https://github.com/TicketWaveHQ/openapi-spec

/**
 * Canonical public base URL for the TicketWave API.
 * The dashboard alias `https://ticketwavehq.com` points at the same
 * deployment; both are documented as `servers` in the OpenAPI spec.
 */
export const DEFAULT_BASE_URL = "https://access.ticketwavehq.com";

/**
 * Read the API key from the environment and fail loudly if it is missing.
 * Keys are issued at https://ticketwavehq.com/dashboard/settings/api-keys and
 * look like `tw_live_xxxxxxxxxxxxxxxx`.
 * @returns {string}
 */
export function requireApiKey() {
  const key = process.env.TICKETWAVE_API_KEY;
  if (!key) {
    console.error(
      "Missing TICKETWAVE_API_KEY.\n" +
        "  export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx\n" +
        "Issue a key at https://ticketwavehq.com/dashboard/settings/api-keys",
    );
    process.exit(1);
  }
  return key;
}

/**
 * A tiny, typed-by-JSDoc wrapper over `fetch` that adds the Bearer header,
 * parses JSON, and surfaces API errors the way the spec documents them
 * (a JSON body with `error` / `message`, and a `429` carrying rate-limit
 * headers). This is the whole "SDK" the examples need.
 */
export function createClient({
  apiKey = requireApiKey(),
  baseUrl = process.env.TICKETWAVE_BASE_URL || DEFAULT_BASE_URL,
} = {}) {
  /**
   * @param {string} path e.g. "/api/v1/events?pageSize=5"
   * @param {RequestInit} [init]
   */
  async function request(path, init = {}) {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    const text = await res.text();
    const body = text ? safeJson(text) : null;

    if (!res.ok) {
      if (res.status === 429) {
        const retry = res.headers.get("retry-after");
        throw new ApiError(
          `Rate limited (429). Retry after ${retry ?? "?"}s. ` +
            "v1 is 120 req/min/key, v2 is 240 req/min/key.",
          res.status,
          body,
        );
      }
      const detail = body?.message || body?.error || res.statusText;
      throw new ApiError(`${init.method || "GET"} ${path} -> ${res.status}: ${detail}`, res.status, body);
    }

    return body;
  }

  return {
    request,
    get: (path) => request(path),
    post: (path, json) => request(path, { method: "POST", body: JSON.stringify(json) }),
  };
}

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {unknown} body
   */
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Build a query string, dropping `undefined` / `null` values.
 * @param {Record<string, string | number | boolean | undefined | null>} params
 */
export function qs(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
