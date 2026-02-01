export interface Token {
    name: string
    email: string
    sub: string
    accessToken: string
    accessTokenExpiry: Date
    refreshToken: string
    iat: number
    exp: number
    jti: string
    id: string
}

export interface User {
    name: 'null'
    email: 'test2@mail.ru'
    image: undefined
    data: {
        accessToken: string
        accessTokenExpiry: Date
        refreshToken: string
        id: string
    }
}
