export const DEFAULT_POST_AUTH_PATH = '/patients'

export const DEFAULT_LOGIN_ROUTE = '/auth/login'

export const DEFAULT_REGISTER_ROUTE = '/auth/register'

/**
 * Паттерны для `middleware.config.matcher` (без `/auth/*` и `/api/auth/*`).
 * Приложение может расширить свой список.
 */
export const DEFAULT_PROTECTED_ROUTE_MATCHER = [
	'/',
	'/patients/:path*',
	'/upload_photo/:path*',
	'/doctor/:path*',
	'/faq/:path*',
] as const
