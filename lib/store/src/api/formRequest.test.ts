import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiFormRequest } from './formRequest'
import { jsonResponse, makeAuthStore, makeJwt } from '../test/helpers'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	vi.stubEnv('VITE_API_BASE_URL', '/api/v1')
	vi.stubEnv('VITE_AUTH_REFRESH_PATH', '/refresh')
})

afterEach(() => {
	fetchMock.mockReset()
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})

describe('apiFormRequest', () => {
	it('после долгой загрузки обновляет протухший токен и отправляет форму с новым', async () => {
		const fresh = makeJwt(300)
		fetchMock
			.mockImplementationOnce(async () => jsonResponse(200, { access_token: fresh, refresh_token: makeJwt(86_400) }))
			.mockImplementationOnce(async () => jsonResponse(201, { id: 'c-1' }))
		const store = makeAuthStore({ accessToken: makeJwt(-10), refreshToken: makeJwt(86_400) })
		const form = new FormData()
		form.append('diagnostic_number', '42')

		await expect(apiFormRequest('/cytology/create', form, store)).resolves.toEqual({ id: 'c-1' })

		const [url, init] = fetchMock.mock.calls[1]
		expect(url).toBe('/api/v1/cytology/create')
		expect(init?.body).toBe(form)
		expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${fresh}`)
	})

	it('с префиксом приложения шлёт форму на /cytology/api/v1', async () => {
		vi.stubEnv('BASE_URL', '/cytology/')
		fetchMock.mockImplementation(async () => jsonResponse(201, { id: 'c-1' }))

		await apiFormRequest('/cytology/create', new FormData(), makeAuthStore({ accessToken: makeJwt(300) }))

		expect(fetchMock.mock.calls[0][0]).toBe('/cytology/api/v1/cytology/create')
	})

	it('ошибку сервера отдаёт как ApiFormRequestError', async () => {
		fetchMock.mockImplementation(async () => jsonResponse(422, { detail: 'bad' }))

		await expect(
			apiFormRequest('/cytology/create', new FormData(), makeAuthStore({ accessToken: makeJwt(300) })),
		).rejects.toMatchObject({ name: 'ApiFormRequestError', status: 422, data: { detail: 'bad' } })
	})
})
