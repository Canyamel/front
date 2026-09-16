export { BRUSH_TOOL, RULER_TOOL, CALIBRATE_TOOL, isRulerLikeTool } from '@medml/viewers'
export type { BrushMode } from '@medml/viewers'
import { BRUSH_TOOL, RULER_TOOL, CALIBRATE_TOOL } from '@medml/viewers'

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

export type ViewerToolId =
	| typeof PAN_TOOL
	| typeof BRUSH_TOOL
	| typeof RULER_TOOL
	| typeof CALIBRATE_TOOL
	| DrawingToolId

/** Инструменты, работающие на собственном слое, мимо Annotorious. */
const OVERLAY_TOOLS: ViewerToolId[] = [PAN_TOOL, BRUSH_TOOL, RULER_TOOL, CALIBRATE_TOOL]

/** Инструмент рисует средствами Annotorious. */
export function isDrawingTool(tool: ViewerToolId): tool is DrawingToolId {
	return !OVERLAY_TOOLS.includes(tool)
}

export const TI_RADS_OPTIONS = [
	'TI-RADS 1',
	'TI-RADS 2',
	'TI-RADS 3',
	'TI-RADS 4',
	'TI-RADS 5',
	'Doctor result',
	'AI',
]
