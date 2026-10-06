import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAppBasePath, getRouterBasename, withBasePath } from './basePath'
import { normalizeBasePath } from './normalizeBasePath'

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('normalizeBasePath', () => {
	it.each([
		[undefined, '/'],
		['', '/'],
		['/', '/'],
		['cytology', '/cytology/'],
		['/cytology', '/cytology/'],
		['/cytology/', '/cytology/'],
		[' /uzi/ ', '/uzi/'],
		['/a/b', '/a/b/'],
	])('%s → %s', (input, expected) => {
		expect(normalizeBasePath(input)).toBe(expected)
	})
})

describe('withBasePath', () => {
	it('в корне путь не меняется', () => {
		expect(withBasePath('/api/v1', '/')).toBe('/api/v1')
	})

	it('добавляет префикс к пути от корня', () => {
		expect(withBasePath('/api/v1', '/cytology/')).toBe('/cytology/api/v1')
		expect(withBasePath('/api/upload/start', '/cytology')).toBe('/cytology/api/upload/start')
	})

	it('сохраняет слеш на конце пути', () => {
		expect(withBasePath('/api/v1/', '/uzi/')).toBe('/uzi/api/v1/')
	})

	it('не трогает абсолютные и относительные адреса', () => {
		expect(withBasePath('http://10.0.0.1:8080/api/v1', '/cytology/')).toBe('http://10.0.0.1:8080/api/v1')
		expect(withBasePath('//cdn.example.com/x.js', '/cytology/')).toBe('//cdn.example.com/x.js')
		expect(withBasePath('api/v1', '/cytology/')).toBe('api/v1')
	})

	it('по умолчанию берёт префикс из BASE_URL', () => {
		vi.stubEnv('BASE_URL', '/cytology/')
		expect(withBasePath('/api/v1')).toBe('/cytology/api/v1')
	})
})

describe('getAppBasePath', () => {
	it('без префикса — корень', () => {
		expect(getAppBasePath()).toBe('/')
	})

	it('относительный base префиксом не считается', () => {
		vi.stubEnv('BASE_URL', './')
		expect(getAppBasePath()).toBe('/')
	})
})

describe('getRouterBasename', () => {
	it('убирает слеш на конце', () => {
		expect(getRouterBasename('/cytology/')).toBe('/cytology')
	})

	it('корень остаётся корнем', () => {
		expect(getRouterBasename('/')).toBe('/')
	})
})
