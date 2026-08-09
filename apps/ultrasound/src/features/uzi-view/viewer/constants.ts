export const NODE_COLORS = [
	'#FF0000',
	'#00FF00',
	'#0000FF',
	'#FFFF00',
	'#FF00FF',
	'#00FFFF',
	'#FFA500',
	'#800080',
	'#008000',
	'#FF69B4',
]

/**
 * Инструменты разметки. Значения — имена инструментов Annotorious
 * (`polygon` встроенный, `freehand` и `line` из selector-pack),
 * поэтому их можно передавать в `setDrawingTool` напрямую.
 */
export const DRAWING_TOOLS = {
	/** Контур по точкам. */
	polygon: 'polygon',
	/** Обводка от руки одним движением (векторная). */
	freehand: 'freehand',
} as const

export type DrawingToolId = keyof typeof DRAWING_TOOLS

/**
 * Режим навигации: перетаскивание двигает снимок, а не рисует.
 *
 * Нужен отдельным пунктом, потому что Annotorious-OSD при включённом
 * рисовании забирает перетаскивание себе. По умолчанию плагин включает
 * рисование только при зажатом Shift — для врача это неочевидно, поэтому
 * режимы разведены явными кнопками.
 */
export const PAN_TOOL = 'pan' as const

/**
 * Кисть-заполнение работает не через Annotorious, а поверх собственного
 * canvas-слоя: врач закрашивает область, а в полигон она превращается
 * только по кнопке «Подтвердить».
 */
export const BRUSH_TOOL = 'brush' as const

/**
 * Линейка тоже работает мимо Annotorious.
 *
 * Через плагин не получилось: после первого же отрезка он выходил из режима
 * рисования (перетаскивание снова двигало снимок), а показать длину прямо во
 * время протяжки было нечем — руббербенд рисует сам плагин. На своём слое
 * есть и живая подпись, и видимая точка начала.
 */
export const RULER_TOOL = 'ruler' as const

export type ViewerToolId =
	| typeof PAN_TOOL
	| typeof BRUSH_TOOL
	| typeof RULER_TOOL
	| DrawingToolId

/** Инструмент рисует средствами Annotorious. */
export function isDrawingTool(tool: ViewerToolId): tool is DrawingToolId {
	return tool !== PAN_TOOL && tool !== BRUSH_TOOL && tool !== RULER_TOOL
}

/** Режим кисти-заполнения. */
export type BrushMode = 'draw' | 'erase'

export const TI_RADS_OPTIONS = [
	'TI-RADS 1',
	'TI-RADS 2',
	'TI-RADS 3',
	'TI-RADS 4',
	'TI-RADS 5',
	'Doctor result',
	'AI',
]
