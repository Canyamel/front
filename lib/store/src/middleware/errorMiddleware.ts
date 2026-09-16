import { isRejectedWithValue, isRejected } from '@reduxjs/toolkit'
import type { Middleware } from '@reduxjs/toolkit'
import type { SerializedError } from '@reduxjs/toolkit'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { message } from 'antd'
import { describeServerErrorBody } from '@medml/shared'

function textFromResponseData(data: unknown): string | null {
	if (!data || typeof data !== 'object') return null
	const d = data as Record<string, unknown>
	const msg = d.message
	if (typeof msg === 'string' && msg.trim()) return msg
	if (Array.isArray(msg) && msg.length && typeof msg[0] === 'string') return msg.join(' ')
	const detail = d.detail
	if (typeof detail === 'string' && detail.trim()) return detail
	if (Array.isArray(detail) && detail.length) {
		const first = detail[0]
		if (first && typeof first === 'object' && first !== null && 'msg' in first) {
			const m = (first as { msg?: unknown }).msg
			if (typeof m === 'string' && m.trim()) return m
		}
	}
	return null
}

const GATEWAY_STATUS_HINTS: Record<number, string> = {
	502: 'Шлюз не смог связаться с сервисом (502). Проверьте, что бэкенд запущен и виден прокси.',
	503: 'Сервис временно недоступен (503). Скорее всего он ещё поднимается.',
	504: 'Сервис не ответил вовремя (504). Проверьте его логи.',
}

function textFromRejectedPayload(payload: unknown): string | null {
	if (payload == null) return null
	const e = payload as FetchBaseQueryError
	if (typeof e === 'object' && e !== null && 'status' in e) {
		// Сеть недоступна: сервер не поднят, не тот порт, упал прокси.
		if (e.status === 'FETCH_ERROR') {
			return 'Не удалось связаться с сервером. Проверьте, что бэкенд запущен.'
		}

		if (e.status === 'TIMEOUT_ERROR') {
			return 'Сервер не ответил вовремя. Попробуйте ещё раз.'
		}

		if (e.status === 'PARSING_ERROR') {
			const status = e.originalStatus
			const fromBody = describeServerErrorBody(e.data)

			if (fromBody) {
				return `Ошибка на сервере (${status}): ${fromBody}`
			}

			return (
				GATEWAY_STATUS_HINTS[status] ??
				`Сервер вернул неожиданный ответ (${status}). Подробности — в консоли и логах бэкенда.`
			)
		}

		if (typeof e.status === 'number' && GATEWAY_STATUS_HINTS[e.status]) {
			return GATEWAY_STATUS_HINTS[e.status]
		}

		const fromBody = textFromResponseData(e.data) ?? describeServerErrorBody(e.data)
		if (fromBody) return fromBody
	}
	return null
}

const DEDUPE_MS = 3000

const lastShownAt = new Map<string, number>()

function showOnce(text: string): void {
	const now = Date.now()
	const previous = lastShownAt.get(text)

	if (previous != null && now - previous < DEDUPE_MS) return

	lastShownAt.set(text, now)
	message.error(text)

	// Карта не должна расти бесконечно в долгой сессии.
	if (lastShownAt.size > 50) {
		for (const [key, at] of lastShownAt) {
			if (now - at >= DEDUPE_MS) lastShownAt.delete(key)
		}
	}
}

/**
 * Запрос, который не отправлялся или был прерван, — не ошибка.
 */
function isSilentRejection(action: unknown): boolean {
	const meta = (action as { meta?: { condition?: boolean; aborted?: boolean } }).meta
	if (meta?.condition || meta?.aborted) return true

	const error = (action as { error?: SerializedError }).error
	return error?.name === 'AbortError' || error?.name === 'ConditionError'
}

const errorMiddleware: Middleware = () => next => action => {
	if (isSilentRejection(action)) {
		return next(action)
	}

	if (isRejectedWithValue(action)) {
		const text = textFromRejectedPayload(action.payload) ?? 'Что-то пошло не так'
		showOnce(text)
	} else if (isRejected(action)) {
		const se = action.error as SerializedError | undefined
		const fromSerialized = typeof se?.message === 'string' && se.message.trim() ? se.message : null
		showOnce(fromSerialized ?? 'Что-то пошло не так')
	}

	return next(action)
}

export default errorMiddleware
