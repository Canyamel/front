import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { persistAuthTokens } from './persistAuthTokens'
import { setToken } from './slices/authSlice'
import { MemoryStorage, makeAuthStore, makeJwt } from './test/helpers'

let local: MemoryStorage
let cleanup: (() => void) | undefined

beforeEach(() => {
	local = new MemoryStorage()
	vi.stubGlobal('localStorage', local)
	vi.stubGlobal('sessionStorage', new MemoryStorage())
	vi.stubGlobal('window', new EventTarget())
})

afterEach(() => {
	cleanup?.()
	cleanup = undefined
	vi.unstubAllGlobals()
})

/** Событие `storage`, как его получает вкладка, когда хранилище поменяла другая. */
function storageEvent(key: string, newValue: string | null, storageArea: unknown = local): Event {
	return Object.assign(new Event('storage'), { key, newValue, storageArea })
}

describe('persistAuthTokens', () => {
	it('при старте восстанавливает живую сессию', () => {
		const access = makeJwt(300)
		const refresh = makeJwt(86_400)
		local.setItem('medml_access_token', access)
		local.setItem('medml_refresh_token', refresh)
		const store = makeAuthStore()

		cleanup = persistAuthTokens(store)

		expect(store.getState().auth).toEqual({ accessToken: access, refreshToken: refresh })
	})

	it('мёртвую сессию стирает из хранилища', () => {
		local.setItem('medml_access_token', makeJwt(-10))
		local.setItem('medml_refresh_token', makeJwt(-10))
		const store = makeAuthStore()

		cleanup = persistAuthTokens(store)

		expect(store.getState().auth.accessToken).toBeUndefined()
		expect(local.getItem('medml_access_token')).toBeNull()
		expect(local.getItem('medml_refresh_token')).toBeNull()
	})

	it('изменения стора пишет в хранилище', () => {
		const store = makeAuthStore()
		cleanup = persistAuthTokens(store)
		const access = makeJwt(300)

		store.dispatch(setToken(access))
		expect(local.getItem('medml_access_token')).toBe(access)

		store.dispatch(setToken(undefined))
		expect(local.getItem('medml_access_token')).toBeNull()
	})

	it('подхватывает токены, обновлённые в другой вкладке', () => {
		const store = makeAuthStore({ accessToken: makeJwt(10), refreshToken: makeJwt(86_400) })
		cleanup = persistAuthTokens(store)
		const access = makeJwt(300)
		const refresh = makeJwt(86_400)

		window.dispatchEvent(storageEvent('medml_access_token', access))
		window.dispatchEvent(storageEvent('medml_refresh_token', refresh))

		expect(store.getState().auth).toEqual({ accessToken: access, refreshToken: refresh })
	})

	it('выход в другой вкладке выводит и из этой', () => {
		const store = makeAuthStore({ accessToken: makeJwt(300), refreshToken: makeJwt(86_400) })
		cleanup = persistAuthTokens(store)

		window.dispatchEvent(storageEvent('medml_access_token', null))

		expect(store.getState().auth).toEqual({ accessToken: undefined, refreshToken: undefined })
	})

	it('события sessionStorage не трогает', () => {
		const access = makeJwt(300)
		const store = makeAuthStore({ accessToken: access, refreshToken: makeJwt(86_400) })
		cleanup = persistAuthTokens(store)

		window.dispatchEvent(storageEvent('medml_access_token', null, sessionStorage))

		expect(store.getState().auth.accessToken).toBe(access)
	})
})
