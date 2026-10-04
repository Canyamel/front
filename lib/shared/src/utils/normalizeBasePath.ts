/**
 * Приводит префикс приложения к виду `/cytology/`: слеш в начале и в конце.
 * Пустое значение — приложение живёт в корне (`/`).
 *
 * Отдельный файл без `import.meta`: его импортируют конфиги Vite, которые
 * собираются в CommonJS.
 */
export function normalizeBasePath(value: string | undefined): string {
	const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '')
	return trimmed ? `/${trimmed}/` : '/'
}
