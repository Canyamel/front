import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query";

import { setToken } from "@/uzi_view/store/authSlice";
import { getApiBaseUrl } from "@/uzi_view/service/apiBaseUrl";
import {
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from "@/lib/tokenStorage";

type RefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  access?: string;
  refresh?: string;
};

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as RefreshResponse;
  const nextAccessToken = data.access_token ?? data.access ?? "";
  const nextRefreshToken = data.refresh_token ?? data.refresh;

  if (!nextAccessToken) {
    return null;
  }

  setAuthToken(nextAccessToken);
  if (nextRefreshToken) {
    setRefreshToken(nextRefreshToken);
  }

  return nextAccessToken;
}

export function createBaseQueryWithReauth(baseUrl: string): BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, api) => {
      const token = (api.getState() as { auth?: { accessToken?: string } })?.auth
        ?.accessToken;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        headers.delete("Authorization");
      }

      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status !== 401) {
      return result;
    }

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const refreshedToken = await refreshPromise;
    if (!refreshedToken) {
      return result;
    }

    api.dispatch(setToken(refreshedToken));
    result = await rawBaseQuery(args, api, extraOptions);
    return result;
  };
}
