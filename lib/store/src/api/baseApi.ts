import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { getBaseUrl, isAuthFreePath } from './apiBase'
import { prepareHeaders } from './headers'
import { ensureFreshAccessToken, refreshTokens } from './tokenRefresh'

const rawBaseQuery = fetchBaseQuery({
	baseUrl: getBaseUrl(),
	prepareHeaders,
})

/**
 * Базовый запрос с живым токеном: токен обновляется до запроса, если истёк,
 * а на 401 — ещё раз, с одним повтором запроса. Подробности — tokenRefresh.ts.
 */
export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
	args,
	api,
	extraOptions,
) => {
	const url = typeof args === 'string' ? args : args.url
	if (isAuthFreePath(url)) {
		return rawBaseQuery(args, api, extraOptions)
	}

	await ensureFreshAccessToken(api)
	const result = await rawBaseQuery(args, api, extraOptions)
	if (result.error?.status !== 401) {
		return result
	}

	const outcome = await refreshTokens(api)
	return outcome === 'refreshed' ? rawBaseQuery(args, api, extraOptions) : result
}

export const baseApi = createApi({
	reducerPath: 'api',
	baseQuery: baseQueryWithReauth,
	tagTypes: ['MedWorker', 'Patient', 'Cytology', 'Auth', 'Segments', 'Uzi', 'Billing', 'Subscription'],
	endpoints: () => ({}),
})

export type BaseApi = typeof baseApi
export type ApiError = FetchBaseQueryError
