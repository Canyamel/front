import { configureStore } from '@reduxjs/toolkit'

import authSlice, { setRefreshToken, setToken } from '../slices/authSlice'

/**
 * Хелперы юнит-тестов lib/store. В сборку приложений не попадают: их
 * импортируют только файлы `*.test.ts`.
 */

/** JWT с `exp` через `secondsFromNow` секунд. Подпись фиктивная — клиент её не проверяет. */
export function makeJwt(secondsFromNow: number): string {
	const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
	const exp = Math.floor(Date.now() / 1000) + secondsFromNow
	// `jti` делает токены с одинаковым сроком различимыми.
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'doctor-1', exp, jti: Math.random() })}.signature`
}

/** Стор только со срезом `auth` — его хватает модулям токенов. */
export function makeAuthStore(tokens: { accessToken?: string; refreshToken?: string } = {}) {
	const store = configureStore({ reducer: { auth: authSlice.reducer } })
	if (tokens.accessToken) store.dispatch(setToken(tokens.accessToken))
	if (tokens.refreshToken) store.dispatch(setRefreshToken(tokens.refreshToken))
	return store
}

/** Хранилище в памяти вместо localStorage / sessionStorage. */
export class MemoryStorage {
	private items = new Map<string, string>()

	get length(): number {
		return this.items.size
	}

	clear(): void {
		this.items.clear()
	}

	getItem(key: string): string | null {
		return this.items.get(key) ?? null
	}

	key(index: number): string | null {
		return [...this.items.keys()][index] ?? null
	}

	removeItem(key: string): void {
		this.items.delete(key)
	}

	setItem(key: string, value: string): void {
		this.items.set(key, String(value))
	}
}

export function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}
