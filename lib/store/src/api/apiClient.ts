/**
 * Универсальный клиент для API запросов
 * Используется как на клиенте (через RTK Query), так и на сервере (через fetch)
 */

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_CYTO_API_BASE_URL || '';
};

interface ApiRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

/**
 * Выполняет API запрос
 * Используется на сервере (в API routes) для единообразия с RTK Query
 */
export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const { url, method = 'GET', body, headers = {}, token } = options;
  
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Вспомогательные функции для конкретных типов запросов
 */
export const apiClient = {
  get: <T>(url: string, token?: string) => 
    apiRequest<T>({ url, method: 'GET', token }),
  
  post: <T>(url: string, body: unknown, token?: string) => 
    apiRequest<T>({ url, method: 'POST', body, token }),
  
  put: <T>(url: string, body: unknown, token?: string) => 
    apiRequest<T>({ url, method: 'PUT', body, token }),
  
  patch: <T>(url: string, body: unknown, token?: string) => 
    apiRequest<T>({ url, method: 'PATCH', body, token }),
  
  delete: <T>(url: string, token?: string) => 
    apiRequest<T>({ url, method: 'DELETE', token }),
};
