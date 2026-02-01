import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthToken, NextAuthUser } from "@medml/auth";
import { apiClient, apiRequest } from "@medml/store";
import dayjs from "dayjs";

interface LoginResponse {
  access: string;
  refresh: string;
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

async function handleLogin(email: string, password: string) {
  try {
    const data = await apiClient.post<LoginResponse>("/auth/login/", { email, password });

    if (data?.access && data?.refresh) {
      return {
        id: "null",
        name: "null",
        email: email,
        data: {
          accessToken: data.access,
          refreshToken: data.refresh,
          accessTokenExpiry: dayjs().add(2, "day").toString(),
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function handleRefreshToken(token: string) {
  try {
    const data = await apiRequest<RefreshTokenResponse>({
      url: "/auth/refresh",
      method: "POST",
      headers: {
        token: token,
      },
    });
    return data;
  } catch {
    throw new Error("Token refresh failed");
  }
}

const authOptions: any = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { type: "text" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.username && credentials?.password) {
          const user = await handleLogin(
            credentials?.username,
            credentials?.password
          );

          if (user?.data.accessToken) {
            return user;
          }

          return null;
        } else {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    jwt: async ({ token, user }: { token: NextAuthToken; user?: NextAuthUser }) => {
      if (user) {
        token.accessToken = String(user?.data.accessToken);
        token.accessTokenExpiry = String(user?.data.accessTokenExpiry);
        token.refreshToken = String(user?.data.refreshToken);
      }

      const shouldRefreshTime = dayjs(token.accessTokenExpiry).diff(
        dayjs().add(1, "day")
      );

      if (shouldRefreshTime > 0) {
        return Promise.resolve(token);
      }

      try {
        const { access_token, refresh_token } = await handleRefreshToken(
          token.refreshToken
        );

        token.accessToken = access_token;
        token.accessTokenExpiry = dayjs().add(2, "day").toString();
        token.refreshToken = refresh_token;
        return Promise.resolve(token);
      } catch {
        return Promise.resolve(token);
      }
    },

    session: async ({ session, token }: any) => {
      session.accessToken = token.accessToken;
      session.accessTokenExpiry = token.accessTokenExpiry;
      return Promise.resolve(session);
    },

    signIn({ user }: { user: any }) {
      return !!user?.data.refreshToken;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 2 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
};

const nextAuthHandler = NextAuth(authOptions);
export const GET = nextAuthHandler;
export const POST = nextAuthHandler;
