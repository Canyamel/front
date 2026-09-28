import { BRUSH_TOOL, CALIBRATE_TOOL, PAN_TOOL, RULER_TOOL, type ViewerToolId } from '@medml/viewers'

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
 * Инструменты, доступные врачу на снимке УЗИ — тот же набор, что в цитологии.
 *
 * Сам набор идентификаторов общий для всех 2D-контуров и живёт в
 * `@medml/viewers`. Навигация, кисть, линейка и задание масштаба
 * обслуживаются вьюером, а `polygon` / `rectangle` — Annotorious 3.
 * Свободного контура (`freehand`) в Annotorious 3 нет: обводку от руки
 * заменяет кисть-заполнение.
 */
export const UZI_VIEWER_TOOLS: ViewerToolId[] = [
	PAN_TOOL,
	'polygon',
	'rectangle',
	BRUSH_TOOL,
	RULER_TOOL,
	CALIBRATE_TOOL,
]
