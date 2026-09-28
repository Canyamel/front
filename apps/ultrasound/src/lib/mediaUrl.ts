/**
 * Бэкенд подписывает ссылки на снимки на `S3_PUBLIC_ENDPOINT`
 * (например `https://localhost/uzi-images/...`). Если фронт открыт с другого
 * origin (Vite dev на :3002, другой хост/порт), браузер идёт на чужой адрес
 * и спотыкается о самоподписанный сертификат или CORS.
 *
 * Ссылки на бакет снимков переводим в относительные: дальше их проксирует
 * тот, кто отдаёт фронт — nginx (`location ^~ /uzi-images/`) или Vite
 * (`server.proxy['/uzi-images']`). Query с подписью сохраняется как есть.
 */
const MEDIA_PREFIX = '/uzi-images/'

export function toSameOriginMediaUrl<T extends string | null | undefined>(url: T): T {
	if (!url) return url
	try {
		const parsed = new URL(url)
		if (parsed.pathname.startsWith(MEDIA_PREFIX)) {
			return `${parsed.pathname}${parsed.search}` as T
		}
	} catch {
		/* относительная ссылка — оставляем как есть */
	}
	return url
}

export function toSameOriginMediaUrls<T extends string[] | undefined>(urls: T): T {
	return (urls ? urls.map(u => toSameOriginMediaUrl(u)) : urls) as T
}
