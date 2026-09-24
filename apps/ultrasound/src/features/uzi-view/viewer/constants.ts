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
 * Инструменты, доступные врачу на снимке УЗИ.
 *
 * Сам набор идентификаторов общий для всех 2D-контуров и живёт в
 * `@medml/viewers`; здесь только выбор того, что умеет наш слой разметки.
 * Навигация, кисть, линейка и задание масштаба обслуживаются вьюером, а
 * `polygon` / `rectangle` / `freehand` — Annotorious 2 с selector-pack.
 */
export const UZI_VIEWER_TOOLS: ViewerToolId[] = [
	PAN_TOOL,
	'polygon',
	'rectangle',
	'freehand',
	BRUSH_TOOL,
	RULER_TOOL,
	CALIBRATE_TOOL,
]

/**
 * Перевод общих id инструментов в имена инструментов Annotorious 2.
 *
 * Совпадает почти всё, кроме прямоугольника: у плагина он зарегистрирован
 * как `rect`, а `freehand` приходит из selector-pack.
 */
export const ANNOTORIOUS_TOOL_NAMES: Partial<Record<ViewerToolId, string>> = {
	rectangle: 'rect',
	polygon: 'polygon',
	freehand: 'freehand',
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
