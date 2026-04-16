import { baseApi } from "@medml/store";
import type {
  RegisterPayload,
  LoginPayload,
  RefreshTokenPayload,
  AuthLoginResponse,
} from "@medml/auth";

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

const getNormalizedApiBase = (): string => {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const processEnv = (
    globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const raw = viteEnv?.VITE_API_BASE_URL ?? processEnv?.NEXT_PUBLIC_API_BASE_URL ?? "";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.replace(/\/auth$/i, "");
};

const buildAuthUrl = (path: string): string => {
  const base = getNormalizedApiBase();
  if (!base) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation<void, RegisterPayload>({
      query: (payload) => ({
        url: buildAuthUrl("/reg/doctor"),
        method: "POST",
        body: {
          email: payload.email,
          password: payload.password1,
          fullname: [payload.last_name, payload.first_name, payload.fathers_name]
            .filter(Boolean)
            .join(" ")
            .trim(),
          org: payload.med_organization ?? "",
          job: "Врач",
          description: "",
        },
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ["Auth", "MedWorker"],
    }),
    login: builder.mutation<AuthLoginResponse, LoginPayload>({
      query: (payload) => ({
        url: buildAuthUrl("/login"),
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
        url: buildAuthUrl("/refresh"),
        method: "POST",
        body: {
          refresh_token: payload.token,
        },
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
