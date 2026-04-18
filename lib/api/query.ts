const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

/** Milliseconds before a request is aborted and treated as a network error. */
const REQUEST_TIMEOUT_MS = 8000;

export type QueryMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueryOptions<TBody = unknown> {
  method?: QueryMethod;
  body?: TBody;
  headers?: Record<string, string>;
  /** Supabase JWT — pass session?.access_token from useAuth() */
  token?: string | null;
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
  const { method = 'GET', body, headers: extraHeaders = {}, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

    const data = (await response.json()) as TData;
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
