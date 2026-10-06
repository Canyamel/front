/**
 * Префикс, под которым опубликовано приложение: `/cytology/`, `/uzi/` или `/`.
 *
 * Vite кладёт его в `import.meta.env.BASE_URL` из опции `base`
 * (см. `VITE_BASE_PATH` в vite.config.ts). Вне Vite — в Node-сервисе
 * загрузки, в Next — префикса нет.
 */
export function getAppBasePath(): string {
	try {
		const value = (import.meta as { env?: Record<string, string | undefined> }).env?.BASE_URL
		return typeof value === 'string' && value.startsWith('/') ? value : '/'
	} catch {
		return '/'
	}
}

/**
 * Путь от корня сайта с учётом префикса приложения:
 * `/api/v1` при префиксе `/cytology/` становится `/cytology/api/v1`.
 *
 * Абсолютные адреса (`http://…`, `//host/…`) и относительные пути не трогает.
 */
export function withBasePath(path: string, base: string = getAppBasePath()): string {
	if (!path.startsWith('/') || path.startsWith('//')) return path
	const prefix = base.replace(/\/+$/, '')
	return prefix ? `${prefix}${path}` : path
}

/** `basename` для роутера: префикс без слеша на конце, `/` для корня. */
export function getRouterBasename(base: string = getAppBasePath()): string {
	return base.replace(/\/+$/, '') || '/'
}
