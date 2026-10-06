import type { UnknownAction } from '@reduxjs/toolkit'

import { isJwtUsable } from '@medml/shared'

import { setRefreshToken, setToken, type AuthState } from './slices/authSlice'
import { AUTH_STORAGE_KEYS, tokenStorage } from './tokenStorage'

interface AuthStore {
	getState(): { auth: AuthState }
	dispatch(action: UnknownAction): unknown
	subscribe(listener: () => void): () => void
}

/**
 * Связывает токены в сторе с хранилищем браузера.
 *
 * 1. При старте восстанавливает живую сессию, мёртвую стирает.
 * 2. Каждое изменение токенов в сторе пишет в хранилище.
 * 3. Изменения из других вкладок (событие `storage`) переносит в стор:
 *    вкладка, обновившая токен, не ломает соседние, а выход в одной
 *    вкладке выводит из всех.
 *
 * Возвращает функцию отписки.
 */
export function persistAuthTokens(store: AuthStore): () => void {
	const persistedAccess = tokenStorage.getAuthToken()
	const persistedRefresh = tokenStorage.getRefreshToken()

	if (isJwtUsable(persistedRefresh) || isJwtUsable(persistedAccess)) {
		if (persistedAccess) store.dispatch(setToken(persistedAccess))
		if (persistedRefresh) store.dispatch(setRefreshToken(persistedRefresh))
	} else {
		tokenStorage.clearAuthTokens()
	}

	let prevAccess = store.getState().auth.accessToken
	let prevRefresh = store.getState().auth.refreshToken
	const unsubscribe = store.subscribe(() => {
		const { accessToken, refreshToken } = store.getState().auth
		if (accessToken !== prevAccess) {
			prevAccess = accessToken
			if (accessToken) {
				tokenStorage.setAuthToken(accessToken)
			} else {
				tokenStorage.clearAuthToken()
			}
		}
		if (refreshToken !== prevRefresh) {
			prevRefresh = refreshToken
			if (refreshToken) {
				tokenStorage.setRefreshToken(refreshToken)
			} else {
				tokenStorage.clearRefreshToken()
			}
		}
	})

	if (typeof window === 'undefined') return unsubscribe

	const onStorage = (event: StorageEvent): void => {
		// sessionStorage между вкладками не синхронизируется — событие
		// приходит только от localStorage («Запомнить меня»).
		if (event.storageArea !== localStorage) return

		const { accessToken, refreshToken } = store.getState().auth
		if (event.key === AUTH_STORAGE_KEYS.access) {
			if (event.newValue && event.newValue !== accessToken) {
				store.dispatch(setToken(event.newValue))
			} else if (!event.newValue && accessToken) {
				// Выход в другой вкладке.
				store.dispatch(setToken(undefined))
			}
		} else if (event.key === AUTH_STORAGE_KEYS.refresh) {
			if (event.newValue && event.newValue !== refreshToken) {
				store.dispatch(setRefreshToken(event.newValue))
			}
		}
	}

	window.addEventListener('storage', onStorage)
	return () => {
		unsubscribe()
		window.removeEventListener('storage', onStorage)
	}
}
