import {
	createApi,
	fetchBaseQuery,
	type BaseQueryFn,
	type FetchArgs,
} from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { prepareHeaders } from './headers'
import { setToken, setRefreshToken } from '../slices/authSlice'
import type { AuthState } from '../slices/authSlice'

const getViteApiBaseUrl = (): string | undefined => {
	try {
		const env = (import.meta as { env?: Record<string, string | undefined> })
			.env
		const url = env?.VITE_BACKEND_BASE_URL ?? env?.VITE_API_BASE_URL
		return typeof url === 'string' && url.length > 0 ? url : undefined
	} catch {
		return undefined
	}
}

const getRefreshPath = (): string => {
	try {
		const env = (import.meta as { env?: Record<string, string | undefined> })
			.env
		const custom = env?.VITE_AUTH_REFRESH_PATH
		if (typeof custom === 'string' && custom.length > 0) {
			return custom.startsWith('/') ? custom : `/${custom}`
		}
	} catch {
		/* ignore */
	}
	return '/auth/token/refresh/'
}

const getBaseUrl = (): string => {
	const viteUrl = getViteApiBaseUrl()
	if (viteUrl) return viteUrl.endsWith('/') ? viteUrl : `${viteUrl}/`

	if (typeof process !== 'undefined' && process.env) {
		if (typeof window === 'undefined') {
			return (
				process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
			)
		}
		return process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
	}

	return ''
}

const joinBase = (base: string, path: string): string => {
	const b = base.replace(/\/$/, '')
	const p = path.startsWith('/') ? path : `/${path}`
	return `${b}${p}`
}

const rawBaseQuery = fetchBaseQuery({
	baseUrl: getBaseUrl(),
	prepareHeaders,
})

/** Не пытаться refresh по этим путям (иначе цикл). */
const isAuthFreePath = (path: string): boolean =>
	path.includes('/login') ||
	path.includes('/refresh') ||
	path.includes('/auth/register')

let refreshSingleton: Promise<void> | null = null

export const baseQueryWithReauth: BaseQueryFn<
	string | FetchArgs,
	unknown,
	FetchBaseQueryError
> = async (args, api, extraOptions) => {
	let result = await rawBaseQuery(args, api, extraOptions)

	if (result.error?.status !== 401) {
		return result
	}

	const url = typeof args === 'string' ? args : args.url
	const path = typeof url === 'string' ? url : ''
	if (isAuthFreePath(path)) {
		return result
	}

	const auth = (api.getState() as { auth: AuthState }).auth
	const refresh = auth.refreshToken
	if (!refresh) {
		return result
	}

	refreshSingleton ??= (async () => {
		const baseUrl = getBaseUrl()
		const res = await fetch(joinBase(baseUrl, getRefreshPath()), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refresh, refresh_token: refresh }),
		})
		if (!res.ok) {
			api.dispatch(setToken(undefined))
			return
		}
		const data = (await res.json()) as {
			access_token?: string
			refresh_token?: string
			access?: string
			refresh?: string
		}
		const accessToken = data.access_token ?? data.access ?? ''
		const newRefresh = data.refresh_token ?? data.refresh ?? refresh
		api.dispatch(setToken(accessToken))
		api.dispatch(setRefreshToken(newRefresh))
	})().finally(() => {
		refreshSingleton = null
	})

	await refreshSingleton
	result = await rawBaseQuery(args, api, extraOptions)
	return result
}

export const baseApi = createApi({
	reducerPath: 'api',
	baseQuery: baseQueryWithReauth,
	tagTypes: ['MedWorker', 'Patient', 'Cytology', 'Auth', 'Segments'],
	endpoints: () => ({}),
})

export type BaseApi = typeof baseApi
export type ApiError = FetchBaseQueryError
