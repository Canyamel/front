import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBaseUrl, joinBase } from './apiBase'

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('getBaseUrl', () => {
	it('без префикса отдаёт базу из env со слешем на конце', () => {
		vi.stubEnv('VITE_API_BASE_URL', '/api/v1')
		expect(getBaseUrl()).toBe('/api/v1/')
	})

	it('добавляет префикс приложения', () => {
		vi.stubEnv('BASE_URL', '/cytology/')
		vi.stubEnv('VITE_API_BASE_URL', '/api/v1')
		expect(getBaseUrl()).toBe('/cytology/api/v1/')
	})

	it('VITE_BACKEND_BASE_URL важнее VITE_API_BASE_URL', () => {
		vi.stubEnv('BASE_URL', '/uzi/')
		vi.stubEnv('VITE_BACKEND_BASE_URL', '/api/v3')
		vi.stubEnv('VITE_API_BASE_URL', '/api/v1')
		expect(getBaseUrl()).toBe('/uzi/api/v3/')
	})

	it('абсолютный адрес бэкенда не префиксует', () => {
		vi.stubEnv('BASE_URL', '/cytology/')
		vi.stubEnv('VITE_API_BASE_URL', 'http://10.164.2.11:8080/api/v1')
		expect(getBaseUrl()).toBe('http://10.164.2.11:8080/api/v1/')
	})
})

describe('joinBase', () => {
	it('склеивает без двойного слеша', () => {
		expect(joinBase('/cytology/api/v1/', '/refresh')).toBe('/cytology/api/v1/refresh')
		expect(joinBase('/cytology/api/v1', 'refresh')).toBe('/cytology/api/v1/refresh')
	})
})
