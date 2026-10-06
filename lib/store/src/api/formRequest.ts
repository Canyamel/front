import { withBasePath } from '@medml/shared';

import { authorizedFetch, type TokenApi } from './tokenRefresh';

const getViteApiBaseUrl = (): string | undefined => {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    const url = env?.VITE_API_BASE_URL;
    return typeof url === 'string' && url.length > 0 ? url : undefined;
  } catch {
    return undefined;
  }
};

export const getApiBaseUrl = (): string => {
  const viteUrl = getViteApiBaseUrl();
  if (viteUrl) return withBasePath(viteUrl);

  if (typeof process !== 'undefined' && process.env) {
    if (typeof window === 'undefined') {
      return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    }
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  }

  return '';
};

const joinBase = (base: string, path: string): string => {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
};

export class ApiFormRequestError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`HTTP ${status}`);
    this.name = 'ApiFormRequestError';
    this.status = status;
    this.data = data;
  }
}

/**
 * POST multipart/form-data одним fetch (без двойного Request в RTK Query).
 *
 * Токен проверяется до отправки и при необходимости обновляется, а на 401
 * запрос повторяется один раз — как в baseQueryWithReauth.
 */
export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  api: TokenApi
): Promise<T> {
  const response = await authorizedFetch(
    joinBase(getApiBaseUrl(), path),
    { method: 'POST', body: formData },
    api
  );

  const text = await response.text();
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiFormRequestError(response.status, data);
  }

  return data as T;
}
