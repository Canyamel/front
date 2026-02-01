import apiInstance from '@/utils/apiInstance'

export default async function refreshUserToken(token: string) {
    console.log('refreshing user token')
    console.log(token)

    const response = await apiInstance({
        method: 'POST',
        url: `refresh`,
        data: { refresh_token: token },
    })

    console.log('response.data', response.data)

    const { access_token, refresh_token } = response.data

    console.log('Получен новый refresh_token', refresh_token)

    return { access_token, refresh_token }
}
