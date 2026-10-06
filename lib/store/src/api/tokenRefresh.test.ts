import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authorizedFetch, ensureFreshAccessToken, refreshTokens } from './tokenRefresh'
import { MemoryStorage, jsonResponse, makeAuthStore, makeJwt } from '../test/helpers'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	vi.stubEnv('VITE_API_BASE_URL', '/api/v1')
	vi.stubEnv('VITE_AUTH_REFRESH_PATH', '/refresh')
	vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	fetchMock.mockReset()
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

const tokenPair = () => ({ access_token: makeJwt(300), refresh_token: makeJwt(86_400) })

describe('ensureFreshAccessToken', () => {
	it('живой токен отдаёт без запроса к серверу', async () => {
		const access = makeJwt(300)
		const store = makeAuthStore({ accessToken: access, refreshToken: makeJwt(86_400) })

		await expect(ensureFreshAccessToken(store)).resolves.toBe(access)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('истёкший токен обновляет одним запросом на все параллельные вызовы', async () => {
		const pair = tokenPair()
		fetchMock.mockImplementation(async () => jsonResponse(200, pair))
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })

		const results = await Promise.all([
			ensureFreshAccessToken(store),
			ensureFreshAccessToken(store),
			ensureFreshAccessToken(store),
		])

		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(results).toEqual([pair.access_token, pair.access_token, pair.access_token])
		expect(store.getState().auth.refreshToken).toBe(pair.refresh_token)
	})

	it('токен, которому осталось меньше 30 секунд, обновляет заранее', async () => {
		fetchMock.mockImplementation(async () => jsonResponse(200, tokenPair()))
		const store = makeAuthStore({ accessToken: makeJwt(10), refreshToken: makeJwt(86_400) })

		await ensureFreshAccessToken(store)

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('без токенов ничего не делает', async () => {
		await expect(ensureFreshAccessToken(makeAuthStore())).resolves.toBeUndefined()
		expect(fetchMock).not.toHaveBeenCalled()
	})
})

describe('refreshTokens', () => {
	it('шлёт POST на базу API с префиксом приложения', async () => {
		vi.stubEnv('BASE_URL', '/cytology/')
		fetchMock.mockImplementation(async () => jsonResponse(200, tokenPair()))
		const refresh = makeJwt(86_400)
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: refresh })

		await expect(refreshTokens(store)).resolves.toBe('refreshed')

		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/cytology/api/v1/refresh')
		expect(init?.method).toBe('POST')
		expect(JSON.parse(String(init?.body))).toEqual({ refresh, refresh_token: refresh })
	})

	it.each([400, 401, 403])('ответ %i — выход, причина в консоли', async status => {
		fetchMock.mockImplementation(async () => jsonResponse(status, { detail: 'invalid token' }))
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })

		await expect(refreshTokens(store)).resolves.toBe('rejected')

		expect(store.getState().auth).toEqual({ accessToken: undefined, refreshToken: undefined })
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(`/api/v1/refresh → ${status}`))
	})

	it.each([404, 500, 502])('ответ %i — сессия сохраняется', async status => {
		fetchMock.mockImplementation(async () => jsonResponse(status, {}))
		const tokens = { accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) }
		const store = makeAuthStore(tokens)

		await expect(refreshTokens(store)).resolves.toBe('unavailable')

		expect(store.getState().auth).toEqual(tokens)
	})

	it('сетевая ошибка — сессия сохраняется, исключение не вылетает', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
		const tokens = { accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) }
		const store = makeAuthStore(tokens)

		await expect(refreshTokens(store)).resolves.toBe('unavailable')

		expect(store.getState().auth).toEqual(tokens)
	})

	it('200 без access_token — сессия сохраняется', async () => {
		fetchMock.mockImplementation(async () => jsonResponse(200, {}))
		const tokens = { accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) }
		const store = makeAuthStore(tokens)

		await expect(refreshTokens(store)).resolves.toBe('unavailable')

		expect(store.getState().auth).toEqual(tokens)
	})

	it('истёкший refresh-токен — выход без запроса', async () => {
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(-10) })

		await expect(refreshTokens(store)).resolves.toBe('rejected')

		expect(fetchMock).not.toHaveBeenCalled()
		expect(store.getState().auth.accessToken).toBeUndefined()
	})

	it('берёт пару, которую уже обновила другая вкладка', async () => {
		const storage = new MemoryStorage()
		vi.stubGlobal('localStorage', storage)
		vi.stubGlobal('sessionStorage', new MemoryStorage())
		const newer = tokenPair()
		storage.setItem('medml_access_token', newer.access_token)
		storage.setItem('medml_refresh_token', newer.refresh_token)
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })

		await expect(refreshTokens(store)).resolves.toBe('refreshed')

		expect(fetchMock).not.toHaveBeenCalled()
		expect(store.getState().auth).toEqual({
			accessToken: newer.access_token,
			refreshToken: newer.refresh_token,
		})
	})
})

describe('authorizedFetch', () => {
	it('истёкший токен обновляет до запроса', async () => {
		const pair = tokenPair()
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(200, pair))
			.mockImplementationOnce(async () => jsonResponse(201, { id: 'c-1' }))
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })

		const response = await authorizedFetch('/api/upload/create-cytology', { method: 'POST', body: '{}' }, store)

		expect(response.status).toBe(201)
		const [, init] = fetchMock.mock.calls[1]
		expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${pair.access_token}`)
	})

	it('на 401 обновляет токен и повторяет запрос один раз', async () => {
		const pair = tokenPair()
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(401, {}))
			.mockImplementationOnce(async () => jsonResponse(200, pair))
			.mockImplementationOnce(async () => jsonResponse(200, { ok: true }))
		const store = makeAuthStore({ accessToken: makeJwt(300), refreshToken: makeJwt(86_400) })

		const response = await authorizedFetch('/api/v1/x', { method: 'GET' }, store)

		expect(response.status).toBe(200)
		expect(fetchMock).toHaveBeenCalledTimes(3)
		const [, retryInit] = fetchMock.mock.calls[2]
		expect(new Headers(retryInit?.headers).get('Authorization')).toBe(`Bearer ${pair.access_token}`)
	})

	it('если обновить не вышло — отдаёт исходный 401', async () => {
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(401, {}))
			.mockImplementationOnce(async () => jsonResponse(503, {}))
		const store = makeAuthStore({ accessToken: makeJwt(300), refreshToken: makeJwt(86_400) })

		const response = await authorizedFetch('/api/v1/x', { method: 'GET' }, store)

		expect(response.status).toBe(401)
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('сохраняет заголовки вызывающего', async () => {
		fetchMock.mockImplementation(async () => jsonResponse(200, {}))
		const store = makeAuthStore({ accessToken: makeJwt(300) })

		await authorizedFetch('/api/v1/x', { headers: { 'Content-Type': 'application/json' } }, store)

		const [, init] = fetchMock.mock.calls[0]
		expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
	})
})
