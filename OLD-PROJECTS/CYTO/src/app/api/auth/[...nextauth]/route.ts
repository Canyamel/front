import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import loginUserInBackend from "@/app/api/auth/[...nextauth]/loginUserInBackend";
import dayjs from "dayjs";
import refreshUserToken from "@/app/api/auth/[...nextauth]/refreshUserToken";
import { Token, User } from "@/app/api/auth/[...nextauth]/Types";

async function loginUser(email: string, password: string) {
    console.log("Это функция получения пользователя из БД");

    try {
        const { access, refresh } = await loginUserInBackend(email, password);
        return {
            id: "null",
            name: "null",
            email: email,
            data: {
                accessToken: access,
                refreshToken: refresh,
                accessTokenExpiry: dayjs().add(2, "day"),
            },
        };
    } catch {
        //console.error(error);
        console.log("Возникла ошибка");
        return null;
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
                console.log("Это функция авторизации", credentials);

                console.log("credentials", credentials);

                if (credentials?.username && credentials?.password) {
                    const user = await loginUser(credentials?.username, credentials?.password);

                    console.log("Полученный пользователь после запроса на сервер", user);

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
        jwt: async ({ token, user }: { token: Token; user?: User }) => {
            console.log("это функция jwt callback");
            console.log("token", token);

            if (user) {
                console.log("jwt callback in user block");
                // This will only be executed at login. Each next invocation will skip this part.
                token.accessToken = String(user?.data.accessToken);
                token.accessTokenExpiry = String(user?.data.accessTokenExpiry);
                token.refreshToken = String(user?.data.refreshToken);
            }

            // If accessTokenExpiry is 24 hours, we have to refresh token before 24 hours pass.
            const shouldRefreshTime = dayjs(token.accessTokenExpiry).diff(dayjs().add(1, "day"));

            // If the token is still valid, just return it.
            if (shouldRefreshTime > 0) {
                return Promise.resolve(token);
            }

            // If the call arrives after 23 hours have passed, we allow to refresh the token.
            const { access_token, refresh_token } = await refreshUserToken(token.refreshToken);

            token.accessToken = access_token;
            token.accessTokenExpiry = dayjs().add(2, "day").toString();
            token.refreshToken = refresh_token;
            return Promise.resolve(token);
        },

        session: async ({ session, token }: any) => {
            console.log("Это функция сессии");
            console.log("session", session);
            // Here we pass accessToken to the client to be used in authentication with your API
            session.accessToken = token.accessToken;
            session.accessTokenExpiry = token.accessTokenExpiry;
            console.log("token", token);
            return Promise.resolve(session);
        },

        signIn({ user }: { user: any }) {
            console.log("Это функция входа");
            console.log("user", user);

            return !!user?.data.refreshToken;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,

    session: {
        strategy: "jwt",
        maxAge: 2 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },

    // pages: {
    //     signIn: '/auth-pages/login',
    //     signOut: '/auth-pages/login',
    //     error: '/error',
    //     newUser: '/auth-pages/register'
    // }
};

const nextAuthHandler = NextAuth(authOptions);
export const GET = nextAuthHandler;
export const POST = nextAuthHandler;
