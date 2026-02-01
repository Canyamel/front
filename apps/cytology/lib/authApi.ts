import { baseApi } from "@medml/store";
import type {
  RegisterPayload,
  LoginPayload,
  RefreshTokenPayload,
  RefreshTokenResponse,
  AuthLoginResponse,
} from "@medml/auth";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerUser: builder.mutation<void, RegisterPayload>({
      query: (payload) => ({
        url: "/auth/register/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Auth"],
    }),
    login: builder.mutation<AuthLoginResponse, LoginPayload>({
      query: (payload) => ({
        url: "/auth/login/",
        method: "POST",
        body: payload,
      }),
      transformResponse: (response: { access: string; refresh: string }): AuthLoginResponse => ({
        accessToken: response.access,
        refreshToken: response.refresh,
      }),
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenPayload>({
      query: (payload) => ({
        url: "/auth/refresh",
        method: "POST",
        headers: {
          token: payload.token,
        },
      }),
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginMutation,
  useRefreshTokenMutation,
} = authApi;
