const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

/** Default milliseconds before a request is aborted and treated as a network error. */
const REQUEST_TIMEOUT_MS = 8000;

export type QueryMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueryOptions<TBody = unknown> {
  method?: QueryMethod;
  /**
   * Request body. If a `FormData` instance, the request is sent as
   * `multipart/form-data` and `Content-Type` is left to `fetch` to set
   * (so the multipart boundary is included). Any other value is JSON-encoded.
   */
  body?: TBody | FormData;
  headers?: Record<string, string>;
  /** Supabase JWT — pass session?.access_token from useAuth() */
  token?: string | null;
  /**
   * Override the default 8s timeout. Use larger values for slow upstreams:
   *   - Voice / Whisper uploads: 60_000
   *   - On-demand LLM recommendations: 45_000
   *   - Regular chat POSTs: 30_000
   */
  timeoutMs?: number;
}

export interface QueryResult<TData> {
  data: TData | null;
  error: string | null;
  status: number | null;
}

/**
 * Generic fetch wrapper for the FastAPI backend.
 *
 * Usage:
 *   const { data, error } = await query<MyType>('/plaid/accounts', { token });
 */
export async function query<TData = unknown, TBody = unknown>(
  path: string,
  options: QueryOptions<TBody> = {},
): Promise<QueryResult<TData>> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    token,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = { ...extraHeaders };
  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let requestBody: BodyInit | undefined;
  if (body === undefined) {
    requestBody = undefined;
  } else if (isFormData) {
    requestBody = body as unknown as FormData;
  } else {
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorBody = (await response.json()) as {
          detail?: string | Array<{ msg: string; loc?: unknown[] }>;
          message?: string;
        };
        if (typeof errorBody.detail === 'string') {
          errorMessage = errorBody.detail;
        } else if (Array.isArray(errorBody.detail) && errorBody.detail.length > 0) {
          // FastAPI/Pydantic validation errors: detail is an array of {msg, loc, ...}
          errorMessage = errorBody.detail.map((e) => e.msg).join(', ');
        } else if (typeof errorBody.message === 'string') {
          errorMessage = errorBody.message;
        }
      } catch {
        // ignore json parse failures on error bodies
      }
      return { data: null, error: errorMessage, status: response.status };
    }

    // DELETE often returns 204 No Content with an empty body — avoid response.json() on that.
    if (response.status === 204) {
      return { data: null as TData, error: null, status: response.status };
    }

    const text = await response.text();
    if (!text.trim()) {
      return { data: null as TData, error: null, status: response.status };
    }

    const data = JSON.parse(text) as TData;
    return { data, error: null, status: response.status };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: 'Request timed out', status: null };
    }
    const message = err instanceof Error ? err.message : 'Network error';
    return { data: null, error: message, status: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
