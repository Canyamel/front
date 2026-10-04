import type { BaseQueryApi } from '@reduxjs/toolkit/query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { jsonResponse, makeAuthStore, makeJwt } from '../test/helpers'

const fetchMock = vi.fn<typeof fetch>()

/** Адрес и заголовок авторизации запроса — и для `Request`, и для пары url/init. */
function describeCall(input: RequestInfo | URL, init?: RequestInit) {
	if (input instanceof Request) {
		return { url: input.url, authorization: input.headers.get('Authorization') }
	}
	return { url: String(input), authorization: new Headers(init?.headers).get('Authorization') }
}

async function loadBaseQuery() {
	// fetchBaseQuery фиксирует baseUrl при импорте, а в Node ему нужен
	// абсолютный адрес — поэтому env ставится до импорта модуля.
	vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/api/v1')
	vi.stubEnv('VITE_AUTH_REFRESH_PATH', '/refresh')
	vi.resetModules()
	const { baseQueryWithReauth } = await import('./baseApi')
	return baseQueryWithReauth
}

function queryApi(store: ReturnType<typeof makeAuthStore>): BaseQueryApi {
	return {
		signal: new AbortController().signal,
		abort: () => {},
		dispatch: store.dispatch,
		getState: store.getState,
		extra: undefined,
		endpoint: 'test',
		type: 'query',
	}
}

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	fetchMock.mockReset()
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

describe('baseQueryWithReauth', () => {
	it('истёкший токен обновляет до запроса, без круга через 401', async () => {
		const baseQuery = await loadBaseQuery()
		const fresh = makeJwt(300)
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(200, { access_token: fresh, refresh_token: makeJwt(86_400) }))
			.mockImplementationOnce(async () => jsonResponse(200, { id: 'c-1' }))
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })

		const result = await baseQuery('/cytology/c-1', queryApi(store), {})

		expect(result.data).toEqual({ id: 'c-1' })
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(describeCall(...fetchMock.mock.calls[0])).toMatchObject({ url: 'http://api.test/api/v1/refresh' })
		expect(describeCall(...fetchMock.mock.calls[1])).toEqual({
			url: 'http://api.test/api/v1/cytology/c-1',
			authorization: `Bearer ${fresh}`,
		})
	})

	it('на 401 обновляет токен и повторяет запрос один раз', async () => {
		const baseQuery = await loadBaseQuery()
		const fresh = makeJwt(300)
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(401, {}))
			.mockImplementationOnce(async () => jsonResponse(200, { access_token: fresh, refresh_token: makeJwt(86_400) }))
			.mockImplementationOnce(async () => jsonResponse(200, { id: 'c-1' }))
		const store = makeAuthStore({ accessToken: makeJwt(300), refreshToken: makeJwt(86_400) })

		const result = await baseQuery('/cytology/c-1', queryApi(store), {})

		expect(result.data).toEqual({ id: 'c-1' })
		expect(fetchMock).toHaveBeenCalledTimes(3)
		expect(describeCall(...fetchMock.mock.calls[2]).authorization).toBe(`Bearer ${fresh}`)
	})

	it('если /refresh недоступен — возвращает исходную ошибку и не разлогинивает', async () => {
		const baseQuery = await loadBaseQuery()
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(401, {}))
			.mockImplementationOnce(async () => jsonResponse(502, {}))
		const tokens = { accessToken: makeJwt(300), refreshToken: makeJwt(86_400) }
		const store = makeAuthStore(tokens)

		const result = await baseQuery('/cytology/c-1', queryApi(store), {})

		expect(result.error).toMatchObject({ status: 401 })
		expect(store.getState().auth).toEqual(tokens)
	})

	it('запрос входа идёт без обновления токена', async () => {
		const baseQuery = await loadBaseQuery()
		fetchMock.mockImplementation(async () => jsonResponse(401, { detail: 'bad credentials' }))
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })

		const result = await baseQuery({ url: '/login', method: 'POST', body: {} }, queryApi(store), {})

		expect(result.error).toMatchObject({ status: 401 })
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
