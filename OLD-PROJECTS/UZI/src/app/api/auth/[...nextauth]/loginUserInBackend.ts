import apiInstance from '@/utils/apiInstance'

export default async function loginUserInBackend(
    email: string,
    password: string
) {
    console.log('loginUserInBackend')

    console.log('email', email)

    console.log('password', password)

    const response = await apiInstance({
        method: 'POST',
        url: `login`,
        data: {
            email,
            password,
        },
    })

    const { access_token, refresh_token } = response.data
    console.log(response.data)
    return { access_token, refresh_token }
}
