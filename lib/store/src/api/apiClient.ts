const getBaseUrl = (): string => {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"
  );
};

export interface ApiRequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

export const apiRequest = async <T>(options: ApiRequestOptions): Promise<T> => {
  const { url, method = "GET", body, headers = {}, token } = options;
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(fullUrl, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error((error as { message?: string }).message ?? `HTTP ${response.status}`);
  }
  return response.json();
};
