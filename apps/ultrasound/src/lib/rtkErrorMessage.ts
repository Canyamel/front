import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'
import { describeServerErrorBody } from '@medml/shared'

function messageFromData(data: unknown): string | null {
	if (!data || typeof data !== 'object') return null
	const d = data as Record<string, unknown>
	const msg = d.message
	if (typeof msg === 'string' && msg.trim()) return msg
	if (Array.isArray(msg) && msg.length && typeof msg[0] === 'string') return msg.join(' ')
	const detail = d.detail
	if (typeof detail === 'string' && detail.trim()) return detail
	return firstFieldError(data)
}

/** Ошибки полей DRF: `{ patient: { email: ["..."] } }` → первая строка. */
function firstFieldError(data: unknown): string | null {
	if (typeof data === 'string') return data.trim() || null
	if (Array.isArray(data)) {
		for (const item of data) {
			const found = firstFieldError(item)
			if (found) return found
		}
		return null
	}
	if (data && typeof data === 'object') {
		for (const value of Object.values(data as Record<string, unknown>)) {
			const found = firstFieldError(value)
			if (found) return found
		}
	}
	return null
}

/**
 * Текст ошибки для UI. Бэкенд УЗИ отдаёт описание в `message` в теле ответа.
 */
export function getRtkErrorMessage(error: unknown): string {
	if (error == null) return 'Неизвестная ошибка'

	const e = error as FetchBaseQueryError
	if (typeof e === 'object' && e !== null && 'status' in e) {
		if (e.status === 'FETCH_ERROR') {
			return 'Не удалось связаться с сервером. Проверьте, что бэкенд запущен.'
		}

		if (e.status === 'TIMEOUT_ERROR') {
			return 'Сервер не ответил вовремя. Попробуйте ещё раз.'
		}

		if (e.status === 'PARSING_ERROR') {
			const fromBody = describeServerErrorBody(e.data)
			return fromBody
				? `Ошибка на сервере (${e.originalStatus}): ${fromBody}`
				: `Сервер вернул неожиданный ответ (${e.originalStatus}). Подробности — в логах бэкенда.`
		}

		const fromBody = messageFromData(e.data)
		if (fromBody) return fromBody

		if (typeof e.status === 'number') {
			return `Ошибка ${e.status}`
		}
	}

	const se = error as SerializedError
	if (typeof se?.message === 'string' && se.message.trim()) {
		return se.message
	}

	return 'Не удалось выполнить запрос'
}
