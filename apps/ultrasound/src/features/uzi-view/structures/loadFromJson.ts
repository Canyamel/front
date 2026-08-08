import type { ThyroidStructureJson } from './types'

/**
 * Загружает и валидирует JSON файл с данными о структурах щитовидной железы.
 *
 * Ожидаемый формат:
 * ```
 * {
 *   "view_type": "cross" | "long_left" | "long_right",
 *   "<frame_num>": {
 *     "structure_name": { "confidence": float, "coords": [[x, y], ...] }
 *   }
 * }
 * ```
 */
export async function loadThyroidStructuresFromJson(
	file: File,
): Promise<ThyroidStructureJson | null> {
	try {
		const text = await file.text()
		const data = JSON.parse(text)

		if (!data.view_type || typeof data.view_type !== 'string') {
			console.error(
				'JSON должен содержать поле view_type (cross, long_left или long_right)',
			)
			return null
		}

		for (const key in data) {
			if (key === 'view_type') continue
			const frameData = data[key]
			if (typeof frameData !== 'object') continue

			for (const structName in frameData) {
				const struct = frameData[structName]
				if (
					!struct.coords ||
					!Array.isArray(struct.coords) ||
					struct.coords.length < 3
				) {
					console.warn(
						`Структура ${structName} на кадре ${key} имеет неверный формат`,
					)
				}
			}
		}

		return data as ThyroidStructureJson
	} catch (error) {
		console.error('Ошибка при загрузке JSON:', error)
		return null
	}
}
