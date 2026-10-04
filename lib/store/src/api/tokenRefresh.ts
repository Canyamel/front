import type { BaseQueryApi } from '@reduxjs/toolkit/query'

import { isJwtExpired, isJwtUsable } from '@medml/shared'

import { getAuthRefreshPath, getBaseUrl, joinBase, refreshUsesTokenHeader } from './apiBase'
import { setRefreshToken, setToken, type AuthState } from '../slices/authSlice'
import { tokenStorage } from '../tokenStorage'

/**
 * Обновление access-токена — одно на всё приложение.
 *
 * Access-токен живёт минуты (у Go-шлюза — 5), refresh — сутки. Поэтому токен
 * обновляется заранее, перед запросом, а ответ 401 остаётся запасным путём.
 * Через этот модуль идут и RTK Query (baseApi.ts), и запросы мимо него
 * (`authorizedFetch`).
 */

/** Чем закончилась попытка обновить токен. */
export type RefreshOutcome =
	/** Новая пара в сторе. */
	| 'refreshed'
	/** Сервер отверг refresh-токен или его нет — сессия закончена. */
	| 'rejected'
	/** Сервер недоступен или ответил не по делу. Сессия сохранена. */
	| 'unavailable'

/** Часть API стора, которой хватает для работы с токенами. */
export type TokenApi = Pick<BaseQueryApi, 'getState' | 'dispatch'>

/** Access-токен, которому осталось меньше, считается протухшим. */
const FRESHNESS_SKEW_SECONDS = 30

/**
 * Ответы `/refresh`, после которых сессию не спасти. Остальное — сеть, 404
 * из-за неверного адреса, 5xx — не повод выкидывать врача на вход.
 */
const REJECTED_STATUSES = new Set([400, 401, 403])

interface RefreshResponse {
	access_token?: string
	refresh_token?: string
	access?: string
	refresh?: string
}

const readAuth = (api: TokenApi): AuthState => (api.getState() as { auth: AuthState }).auth

const logout = (api: TokenApi): void => {
	api.dispatch(setToken(undefined))
	api.dispatch(setRefreshToken(undefined))
}

let inFlight: Promise<RefreshOutcome> | null = null

/** Обновить пару токенов. Параллельные вызовы получают один и тот же промис. */
export function refreshTokens(api: TokenApi): Promise<RefreshOutcome> {
	inFlight ??= requestNewTokens(api).finally(() => {
		inFlight = null
	})
	return inFlight
}

async function requestNewTokens(api: TokenApi): Promise<RefreshOutcome> {
	const auth = readAuth(api)

	// Другая вкладка могла уже обновить пару и положить её в хранилище.
	// Тогда свой запрос не нужен, а при ротации refresh-токена и вреден:
	// старый refresh сервер уже не примет.
	const storedAccess = tokenStorage.getAuthToken()
	if (storedAccess && storedAccess !== auth.accessToken && isJwtUsable(storedAccess, FRESHNESS_SKEW_SECONDS)) {
		api.dispatch(setToken(storedAccess))
		const storedRefresh = tokenStorage.getRefreshToken()
		if (storedRefresh) api.dispatch(setRefreshToken(storedRefresh))
		return 'refreshed'
	}

	const refresh = tokenStorage.getRefreshToken() ?? auth.refreshToken
	if (!refresh) return 'rejected'
	if (isJwtExpired(refresh)) {
		logout(api)
		return 'rejected'
	}

	const url = joinBase(getBaseUrl(), getAuthRefreshPath())
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	const init: RequestInit = { method: 'POST', headers }
	if (refreshUsesTokenHeader()) {
		headers.token = refresh
	} else {
		init.body = JSON.stringify({ refresh, refresh_token: refresh })
	}

	let response: Response
	try {
		response = await fetch(url, init)
	} catch (error) {
		console.warn(`[auth] POST ${url} не выполнен, сессия сохранена`, error)
		return 'unavailable'
	}

	if (REJECTED_STATUSES.has(response.status)) {
		console.warn(`[auth] POST ${url} → ${response.status}: refresh-токен отклонён, выход`)
		logout(api)
		return 'rejected'
	}

	if (!response.ok) {
		console.warn(`[auth] POST ${url} → ${response.status}, сессия сохранена`)
		return 'unavailable'
	}

	const data = (await response.json().catch(() => null)) as RefreshResponse | null
	const accessToken = data?.access_token ?? data?.access
	if (!accessToken) {
		console.warn(`[auth] POST ${url} → ${response.status} без access_token, сессия сохранена`)
		return 'unavailable'
	}

	api.dispatch(setToken(accessToken))
	api.dispatch(setRefreshToken(data?.refresh_token ?? data?.refresh ?? refresh))
	return 'refreshed'
}

/**
 * Живой access-токен для запроса. Если он истёк или вот-вот истечёт, а
 * refresh ещё жив, — сначала обновляет пару.
 */
export async function ensureFreshAccessToken(api: TokenApi): Promise<string | undefined> {
	const { accessToken, refreshToken } = readAuth(api)
	if (!accessToken && !refreshToken) return undefined
	if (isJwtUsable(accessToken, FRESHNESS_SKEW_SECONDS)) return accessToken

	await refreshTokens(api)
	return readAuth(api).accessToken
}

/**
 * `fetch` с токеном для запросов мимо RTK Query: проверяет токен до запроса,
 * при 401 обновляет его и повторяет запрос один раз.
 *
 * Тело должно переживать повторную отправку: строка, FormData, Blob — да,
 * ReadableStream — нет.
 */
export async function authorizedFetch(url: string, init: RequestInit, api: TokenApi): Promise<Response> {
	const send = (): Promise<Response> => {
		const headers = new Headers(init.headers)
		const token = readAuth(api).accessToken
		if (token) headers.set('Authorization', `Bearer ${token}`)
		return fetch(url, { ...init, headers })
	}

	await ensureFreshAccessToken(api)
	const response = await send()
	if (response.status !== 401) return response

	return (await refreshTokens(api)) === 'refreshed' ? send() : response
}
