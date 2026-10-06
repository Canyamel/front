/**
 * Хранение токенов авторизации в браузере — общее для всех фронтов.
 */
const ACCESS_KEY = 'medml_access_token'
const REFRESH_KEY = 'medml_refresh_token'
/** «Запомнить меня»: "1" — токены в localStorage, "0" — в sessionStorage. */
const REMEMBER_KEY = 'medml_remember_session'

/** Ключи токенов — для синхронизации вкладок по событию `storage`. */
export const AUTH_STORAGE_KEYS = { access: ACCESS_KEY, refresh: REFRESH_KEY } as const

function safe<T>(fn: () => T, fallback: T): T {
	try {
		return fn()
	} catch {
		return fallback
	}
}

function isSessionRemembered(): boolean {
	return safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true)
}

/**
 * Переключает место хранения токенов. Вызывать ДО записи новых токенов:
 * `setAuthToken` / `setRefreshToken` пишут туда, куда указывает флаг.
 */
function setRememberSession(remember: boolean): void {
	safe(() => localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'), undefined)
}

function readToken(key: string): string | null {
	// Токен лежит в одном из хранилищ — смотрим оба.
	return safe(() => localStorage.getItem(key), null) ?? safe(() => sessionStorage.getItem(key), null)
}

function writeToken(key: string, token: string): void {
	const remember = isSessionRemembered()
	const target = remember ? localStorage : sessionStorage
	const other = remember ? sessionStorage : localStorage
	safe(() => target.setItem(key, token), undefined)
	// Убираем копию из второго хранилища, иначе «незапомненный» токен
	// мог бы остаться в localStorage от прошлого входа.
	safe(() => other.removeItem(key), undefined)
}

function removeToken(key: string): void {
	safe(() => localStorage.removeItem(key), undefined)
	safe(() => sessionStorage.removeItem(key), undefined)
}

function getAuthToken(): string | null {
	return readToken(ACCESS_KEY)
}

function setAuthToken(token: string): void {
	writeToken(ACCESS_KEY, token)
}

function getRefreshToken(): string | null {
	return readToken(REFRESH_KEY)
}

function setRefreshToken(token: string): void {
	writeToken(REFRESH_KEY, token)
}

function clearAuthToken(): void {
	removeToken(ACCESS_KEY)
}

function clearRefreshToken(): void {
	removeToken(REFRESH_KEY)
}

function clearAuthTokens(): void {
	clearAuthToken()
	clearRefreshToken()
}

/**
 * Всё API одним объектом: в `@medml/store` уже есть экшен `setRefreshToken`,
 * поэтому функции хранилища экспортируются под своим пространством имён.
 */
export const tokenStorage = {
	isSessionRemembered,
	setRememberSession,
	getAuthToken,
	setAuthToken,
	getRefreshToken,
	setRefreshToken,
	clearAuthToken,
	clearRefreshToken,
	clearAuthTokens,
} as const
