export type ThyroidStructureJson = {
	view_type: string
	[pageIndex: string]: {
		[structureName: string]: {
			confidence?: number
			coords: [number, number][]
		}
	}
}

// Demo structures - используется если JSON не загружен
export const demoThyroidStructures: ThyroidStructureJson = {
	view_type: 'long_left',
	'0': {
		left_lobe: {
			confidence: 0.92,
			coords: [
				[120, 80],
				[430, 90],
				[420, 380],
				[140, 360],
				[120, 80],
			],
		},
		right_lobe: {
			confidence: 0.88,
			coords: [
				[470, 90],
				[780, 100],
				[760, 370],
				[450, 360],
				[470, 90],
			],
		},
		isthmus: {
			confidence: 0.78,
			coords: [
				[410, 140],
				[455, 145],
				[455, 190],
				[410, 185],
				[410, 140],
			],
		},
	},
}

/**
 * Загружает и валидирует JSON файл с данными о структурах щитовидной железы
 * Ожидает формат:
 * {
 *   "view_type": "cross" | "long_left" | "long_right",
 *   "<frame_num>": {
 *     "structure_name": {
 *       "confidence": float,
 *       "coords": [[x, y], [x, y], ...]
 *     }
 *   }
 * }
 */
export async function loadThyroidStructuresFromJson(
	file: File,
): Promise<ThyroidStructureJson | null> {
	try {
		const text = await file.text()
		const data = JSON.parse(text)

		// Валидируем что есть view_type
		if (!data.view_type || typeof data.view_type !== 'string') {
			console.error(
				'JSON должен содержать поле view_type (cross, long_left или long_right)',
			)
			return null
		}

		// Валидируем структуру данных
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
