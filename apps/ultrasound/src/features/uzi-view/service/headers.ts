import { AuthState } from '../store/authSlice'

export const prepareHeaders = (
    headers: Headers,
    { getState }: { getState: () => unknown }
) => {
    headers.set(
        'Authorization',
        `Bearer ${(getState() as { auth: AuthState }).auth.accessToken ?? ''}`
    )

    return headers
}
