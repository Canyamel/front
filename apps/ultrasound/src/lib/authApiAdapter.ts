import { useMemo } from 'react'

import type { IAuthApi } from '@medml/auth'
import { useLoginMutation, useRegisterUserMutation } from '@/api/authApi'
import { setRefreshToken as setRefreshTokenState, setToken, unwrapMutation, useAppDispatch } from '@medml/store'
import { setAuthToken, setRefreshToken, setRememberSession } from './tokenStorage'

export function useUltrasoundAuthApi(): IAuthApi {
	const dispatch = useAppDispatch()
	const [loginMutation] = useLoginMutation()
	const [registerMutation] = useRegisterUserMutation()
	const loginWithUnwrap = unwrapMutation(loginMutation)
	const registerWithUnwrap = unwrapMutation(registerMutation)

	return useMemo(
		() => ({
			login: async (payload, options) => {
				const data = await loginWithUnwrap(payload)
				setRememberSession(options?.remember ?? true)
				dispatch(setToken(data.accessToken))
				dispatch(setRefreshTokenState(data.refreshToken))
				setAuthToken(data.accessToken)
				setRefreshToken(data.refreshToken)
				return data
			},
			register: async payload => {
				await registerWithUnwrap(payload)
			},
		}),
		[dispatch, loginWithUnwrap, registerWithUnwrap],
	)
}
