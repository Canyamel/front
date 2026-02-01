import { baseApi } from "@medml/store";
import type {
  RegisterPayload,
  LoginPayload,
  LoginResponse,
  RefreshTokenPayload,
  RefreshTokenResponse,
} from "../types";

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
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (payload) => ({
        url: "/auth/login/",
        method: "POST",
        body: payload,
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
