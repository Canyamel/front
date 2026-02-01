import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import loginUserInBackend from '@/app/api/auth/[...nextauth]/loginUserInBackend'
import dayjs from 'dayjs'
import refreshUserToken from '@/app/api/auth/[...nextauth]/refreshUserToken'
import { Token, User } from '@/app/api/auth/[...nextauth]/Types'
// import { mockProviders } from 'next-auth/client/__tests__/helpers/mocks'
// import id = mockProviders.github.id
import { jwtDecode } from 'jwt-decode'

interface jwtPayloadAuth {
    exp: number
    id: string
    role: 'doctor' | 'patient'
}
const ADDED_MINUTE_TOKEN_EXPIRY = 2
async function loginUser(username: string, password: string) {
    console.log('Это функция получения пользователя из БД')

    try {
        const { access_token, refresh_token } = await loginUserInBackend(
            username,
            password
        )

        const jwtDecoded = jwtDecode<jwtPayloadAuth>(access_token)
        return {
            id: jwtDecoded.id,
            name: 'null',
            email: username,
            data: {
                accessToken: access_token,
                refreshToken: refresh_token,
                accessTokenExpiry: dayjs()
                    .add(ADDED_MINUTE_TOKEN_EXPIRY, 'minute')
                    .toDate(),
                id: jwtDecoded.id,
            },
        }
    } catch {
        //console.error(error);
        console.log('Возникла ошибка')
        return null
    }
}

const authOptions: any = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { type: 'text' },
                password: { type: 'password' },
            },
            async authorize(credentials) {
                console.log('Это функция авторизации', credentials)

                console.log('credentials', credentials)

                if (credentials?.email && credentials?.password) {
                    const user = await loginUser(
                        credentials?.email,
                        credentials?.password
                    )

                    console.log(
                        'Полученный пользователь после запроса на сервер',
                        user
                    )

                    if (user?.data.accessToken) {
                        return user
                    }

                    return null
                } else {
                    return null
                }
            },
        }),
    ],

    callbacks: {
        jwt: async ({ token, user }: { token: Token; user?: User }) => {
            console.log('это функция jwt callback')
            console.log('token', token)

            if (user) {
                console.log('jwt callback in user block')
                // This will only be executed at login. Each next invocation will skip this part.
                token.accessToken = String(user?.data.accessToken)
                token.accessTokenExpiry = user?.data.accessTokenExpiry
                token.refreshToken = String(user?.data.refreshToken)
                token.id = String(user?.data.id)
            }

            // If accessTokenExpiry is 24 hours, we have to refresh token before 24 hours pass.
            const shouldRefreshTime = dayjs(token.accessTokenExpiry).diff(
                dayjs().add(ADDED_MINUTE_TOKEN_EXPIRY, 'minute')
            )

            // If the token is still valid, just return it.
            if (shouldRefreshTime > 0) {
                return Promise.resolve(token)
            }

            // If the call arrives after 23 hours have passed, we allow to refresh the token.
            const { access_token, refresh_token } = await refreshUserToken(
                token.refreshToken
            )

            token.accessToken = access_token
            token.accessTokenExpiry = dayjs().add(2, 'minute').toDate()
            token.refreshToken = refresh_token

            return Promise.resolve(token)
        },

        session: async ({ session, token }: any) => {
            console.log('Это функция сессии')
            console.log('session', session)
            // Here we pass accessToken to the client to be used in authentication with your API
            session.accessToken = token.accessToken
            session.accessTokenExpiry = token.accessTokenExpiry
            session.id = token.id

            console.log('token', token)
            console.log('session', session)
            return Promise.resolve(session)
        },

        signIn({ user }: { user: any }) {
            console.log('Это функция входа')
            console.log('user', user)

            return !!user?.data.refreshToken
        },
    },

    secret: process.env.NEXTAUTH_SECRET,

    session: {
        strategy: 'jwt',
        maxAge: ADDED_MINUTE_TOKEN_EXPIRY * 10 * 24,
        updateAge: ADDED_MINUTE_TOKEN_EXPIRY * 60,
    },

    // pages: {
    //     signIn: '/auth-pages/login',
    //     signOut: '/auth-pages/login',
    //     error: '/error',
    //     newUser: '/auth-pages/register'
    // }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
