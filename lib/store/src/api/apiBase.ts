import { withBasePath } from '@medml/shared'

/**
 * Адреса API: база, путь обновления токена и пути, которым токен не нужен.
 *
 * Отдельно от baseApi.ts, чтобы ими пользовался и модуль обновления токена
 * (tokenRefresh.ts) без циклического импорта.
 */

const getViteEnv = (): Record<string, string | undefined> | undefined => {
	try {
		return (import.meta as { env?: Record<string, string | undefined> }).env
	} catch {
		return undefined
	}
}

const getViteApiBaseUrl = (): string | undefined => {
	const env = getViteEnv()
	const url = env?.VITE_BACKEND_BASE_URL ?? env?.VITE_API_BASE_URL
	return typeof url === 'string' && url.length > 0 ? url : undefined
}

/** База API со слешем на конце и префиксом приложения: `/cytology/api/v1/`. */
export const getBaseUrl = (): string => {
	const viteUrl = getViteApiBaseUrl()
	if (viteUrl) return withBasePath(viteUrl.endsWith('/') ? viteUrl : `${viteUrl}/`)

	if (typeof process !== 'undefined' && process.env) {
		if (typeof window === 'undefined') {
			return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
		}
		return process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
	}

	return ''
}

export const joinBase = (base: string, path: string): string => {
	const b = base.replace(/\/$/, '')
	const p = path.startsWith('/') ? path : `/${path}`
	return `${b}${p}`
}

export const getAuthRefreshPath = (): string => getViteEnv()?.VITE_AUTH_REFRESH_PATH ?? '/auth/token/refresh/'

export const refreshUsesTokenHeader = (): boolean => getViteEnv()?.VITE_AUTH_REFRESH_HEADER_TOKEN === 'true'

/** Запросы, которым токен не нужен: вход, обновление, регистрация. */
export const isAuthFreePath = (path: string): boolean =>
	path.includes('/login') ||
	path.includes('/refresh') ||
	path.includes('/auth/register') ||
	// Go-шлюз: регистрация врача и пациента.
	path.includes('/reg/')
