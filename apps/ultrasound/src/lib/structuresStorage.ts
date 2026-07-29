import type { ThyroidStructureJson } from '@/features/thyroid-results/demoThyroidStructures'

const STORAGE_KEY_PREFIX = 'uzi_thyroid_structures_'

/**
 * Сохраняет структуры ЩЖ в localStorage
 * @param imageid ID изображения для использования как ключ
 * @param structures Данные структур
 * @param expirationMs Время жизни в миллисекундах (по умолчанию 1 час)
 */
export function saveThyroidStructures(
	imageid: string | number,
	structures: ThyroidStructureJson,
	expirationMs = 60 * 60 * 1000, // 1 час по умолчанию
) {
	try {
		const key = `${STORAGE_KEY_PREFIX}${imageid}`
		const data = {
			structures,
			savedAt: Date.now(),
			expiresAt: Date.now() + expirationMs,
		}
		localStorage.setItem(key, JSON.stringify(data))
	} catch (error) {
		console.error('Ошибка при сохранении структур:', error)
	}
}

/**
 * Загружает структуры ЩЖ из localStorage
 * @param imageid ID изображения
 * @returns Структуры или null если истекло время или нет данных
 */
export function loadThyroidStructures(
	imageid: string | number,
): ThyroidStructureJson | null {
	try {
		const key = `${STORAGE_KEY_PREFIX}${imageid}`
		const stored = localStorage.getItem(key)
		if (!stored) return null

		const data = JSON.parse(stored)
		if (Date.now() > data.expiresAt) {
			localStorage.removeItem(key)
			return null
		}

		return data.structures as ThyroidStructureJson
	} catch (error) {
		console.error('Ошибка при загрузке структур:', error)
		return null
	}
}

/**
 * Удаляет структуры ЩЖ из localStorage
 * @param imageid ID изображения
 */
export function removeThyroidStructures(imageid: string | number) {
	try {
		const key = `${STORAGE_KEY_PREFIX}${imageid}`
		localStorage.removeItem(key)
	} catch (error) {
		console.error('Ошибка при удалении структур:', error)
	}
}

/**
 * Удаляет все истекшие структуры из localStorage
 */
export function cleanupExpiredStructures() {
	try {
		const keys = Object.keys(localStorage)
		const now = Date.now()

		for (const key of keys) {
			if (key.startsWith(STORAGE_KEY_PREFIX)) {
				const stored = localStorage.getItem(key)
				if (stored) {
					const data = JSON.parse(stored)
					if (now > data.expiresAt) {
						localStorage.removeItem(key)
					}
				}
			}
		}
	} catch (error) {
		console.error('Ошибка при очистке истекших структур:', error)
	}
}
