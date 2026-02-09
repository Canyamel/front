import NextAuth from "next-auth";
import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiRequest } from "@medml/store";
import dayjs from "dayjs";

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

const handleRefreshToken = async (token: string) => {
  const data = await apiRequest<RefreshTokenResponse>({
    url: "/auth/refresh",
    method: "POST",
    headers: { token },
  });
  return data;
};

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        accessToken: { type: "text" },
        refreshToken: { type: "text" },
      },
      async authorize(credentials): Promise<User | null> {
        const accessToken = credentials?.accessToken;
        const refreshToken = credentials?.refreshToken;
        if (!accessToken || !refreshToken) return null;

        return {
          id: "null",
          name: "null",
          email: "",
          image: null,
          data: {
            accessToken,
            refreshToken,
            accessTokenExpiry: dayjs().add(2, "day").toString(),
          },
        } as unknown as User;
      },
    }),
  ],

  callbacks: {
    jwt: async ({ token, user }: { token: JWT; user?: User }) => {
      if (user?.data) {
        token.accessToken = user.data.accessToken;
        token.accessTokenExpiry = user.data.accessTokenExpiry;
        token.refreshToken = user.data.refreshToken;
      }

      const shouldRefreshTime = dayjs(token.accessTokenExpiry).diff(
        dayjs().add(1, "day")
      );

      if (shouldRefreshTime > 0) {
        return token;
      }

      try {
        const { access_token, refresh_token } = await handleRefreshToken(
          token.refreshToken
        );

        token.accessToken = access_token;
        token.accessTokenExpiry = dayjs().add(2, "day").toString();
        token.refreshToken = refresh_token;
        return token;
      } catch {
        return token;
      }
    },

    session: async ({ session, token }) => {
      session.accessToken = token.accessToken;
      session.accessTokenExpiry = token.accessTokenExpiry;
      return session;
    },

    signIn({ user }) {
      return !!user?.data?.refreshToken;
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
