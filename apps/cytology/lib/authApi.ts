import { baseApi } from "@medml/store";
import type {
  RegisterPayload,
  LoginPayload,
  RefreshTokenPayload,
  AuthLoginResponse,
} from "@medml/auth";

/**
 * Опциональный GET «проверки сессии» на бэкенде.
 * Включить: `VITE_SESSION_CHECK=true`, при необходимости `VITE_SESSION_PATH=...`.
 */
export function getSessionConfig(): { enabled: boolean; path: string } {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    if (env?.VITE_SESSION_CHECK !== "true") {
      return { enabled: false, path: "" };
    }
    const custom = env?.VITE_SESSION_PATH;
    if (typeof custom === "string" && custom.length > 0) {
      return { enabled: true, path: custom };
    }
    return { enabled: true, path: "/session" };
  } catch {
    return { enabled: false, path: "" };
  }
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation<void, RegisterPayload>({
      query: (payload) => ({
        url: "/auth/register/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ["Auth", "MedWorker"],
    }),
    login: builder.mutation<AuthLoginResponse, LoginPayload>({
      query: (payload) => ({
        url: "/auth/login/",
        method: "POST",
        body: payload,
      }),
      transformResponse: (
        response: {
          access_token?: string;
          refresh_token?: string;
          access?: string;
          refresh?: string;
        }
      ): AuthLoginResponse => ({
        accessToken: response.access_token ?? response.access ?? "",
        refreshToken: response.refresh_token ?? response.refresh ?? "",
      }),
    }),
    refreshToken: builder.mutation<AuthLoginResponse, RefreshTokenPayload>({
      query: (payload) => ({
        url: "/auth/refresh",
        method: "POST",
        headers: { token: payload.token },
      }),
      transformResponse: (
        response: {
          access_token?: string;
          refresh_token?: string;
          access?: string;
          refresh?: string;
        }
      ): AuthLoginResponse => ({
        accessToken: response.access_token ?? response.access ?? "",
        refreshToken: response.refresh_token ?? response.refresh ?? "",
      }),
    }),
    getSession: builder.query<Record<string, unknown>, void>({
      query: () => {
        const { path } = getSessionConfig();
        return { url: path, method: "GET" };
      },
      providesTags: ["Auth"],
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useGetSessionQuery,
  useLazyGetSessionQuery,
} = authApi;
