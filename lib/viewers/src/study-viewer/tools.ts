import type React from 'react'

/**
 * Единый набор инструментов рабочего места врача.
 *
 * Раньше список инструментов был свой в каждом контуре: в УЗИ —
 * `pan | polygon | freehand | brush | ruler | calibrate`, в цитологии —
 * `move | rectangle | polygon`. Одно и то же действие называлось по-разному
 * (`pan` против `move`), а инструменты, которых в одном контуре не было,
 * нельзя было включить без копирования кода.
 *
 * Здесь идентификаторы общие, а какие из них доступны — решает приложение
 * через `tools` у `<AnnotatedStudyViewer />`.
 */

/** Навигация: перетаскивание двигает снимок, а не рисует. */
export const PAN_TOOL = 'pan' as const

/** Кисть-заполнение: закрасить область и превратить её в контур. */
export const BRUSH_TOOL = 'brush' as const

/** Линейка: произвольные измерения по снимку. */
export const RULER_TOOL = 'ruler' as const

/** Задание масштаба по эталонному отрезку. */
export const CALIBRATE_TOOL = 'calibrate' as const

/**
 * Инструменты рисования — их обрабатывает слой разметки приложения
 * (`ViewerAnnotationLayer`), а не сам вьюер.
 *
 * Значения совпадают с именами инструментов обеих версий Annotorious
 * (`polygon`, `rectangle`, `freehand`), поэтому адаптеру достаточно передать
 * id дальше в `setDrawingTool`, ничего не переводя.
 */
export const DRAWING_TOOLS = ['rectangle', 'polygon', 'freehand'] as const

export type DrawingToolId = (typeof DRAWING_TOOLS)[number]

export type ViewerToolId =
	| typeof PAN_TOOL
	| typeof BRUSH_TOOL
	| typeof RULER_TOOL
	| typeof CALIBRATE_TOOL
	| DrawingToolId

/** Инструменты, которые вьюер обслуживает сам, мимо слоя разметки. */
export const OVERLAY_TOOLS: ViewerToolId[] = [
	PAN_TOOL,
	BRUSH_TOOL,
	RULER_TOOL,
	CALIBRATE_TOOL,
]

/** Инструмент рисует средствами слоя разметки. */
export function isDrawingTool(tool: ViewerToolId): tool is DrawingToolId {
	return (DRAWING_TOOLS as readonly string[]).includes(tool)
}

/** Инструмент использует слой линейки (протяжка отрезка). */
export function isRulerLikeTool(tool: ViewerToolId): boolean {
	return tool === RULER_TOOL || tool === CALIBRATE_TOOL
}

/**
 * Инструменты, доступные и в режиме просмотра.
 *
 * Навигация, линейка и задание масштаба ничего не меняют: измерения живут
 * только в состоянии вьюера и на бэкенд не уходят (см.
 * `useRulerMeasurements`). Прятать их за режимом редактирования незачем —
 * врач меряет образование и при обычном просмотре, а раньше для этого
 * приходилось открывать редактирование результатов.
 */
export const READ_ONLY_TOOLS: ViewerToolId[] = [PAN_TOOL, RULER_TOOL, CALIBRATE_TOOL]

/** Инструмент не меняет разметку, поэтому доступен и без редактирования. */
export function isReadOnlyTool(tool: ViewerToolId): boolean {
	return READ_ONLY_TOOLS.includes(tool)
}

/** Режим кисти-заполнения. */
export type BrushMode = 'draw' | 'erase'

export interface ViewerToolMeta {
	id: ViewerToolId
	label: string
	/** Подсказка в тултипе: что делать этим инструментом. */
	hint: string
	icon?: React.ReactNode
}

/**
 * Подписи инструментов. Держим их здесь, а не в приложениях: одинаковые
 * действия должны называться одинаково в обоих контурах — врач работает
 * и там, и там.
 */
export const VIEWER_TOOL_META: Record<ViewerToolId, ViewerToolMeta> = {
	[PAN_TOOL]: {
		id: PAN_TOOL,
		label: 'Навигация',
		hint: 'Перемещение и масштаб снимка',
	},
	rectangle: {
		id: 'rectangle',
		label: 'Прямоугольник',
		hint: 'Выделить область рамкой',
	},
	polygon: {
		id: 'polygon',
		label: 'Контур',
		hint: 'Обвести объект по точкам',
	},
	freehand: {
		id: 'freehand',
		label: 'Обводка',
		hint: 'Векторная обводка от руки',
	},
	[BRUSH_TOOL]: {
		id: BRUSH_TOOL,
		label: 'Кисть',
		hint: 'Закрасить область, затем «Подтвердить»',
	},
	[RULER_TOOL]: {
		id: RULER_TOOL,
		label: 'Линейка',
		hint: 'Зажмите и протяните по снимку — размер покажется сразу',
	},
	[CALIBRATE_TOOL]: {
		id: CALIBRATE_TOOL,
		label: 'Задать масштаб',
		hint: 'Протяните отрезок по шкале снимка и укажите его длину в мм',
	},
}

/**
 * Набор инструментов по умолчанию — всё, что умеет вьюер.
 *
 * Приложение сужает его под свой слой разметки: Annotorious 2 в УЗИ не знает
 * про `rectangle`, Annotorious 3 в цитологии — про `freehand`.
 */
export const DEFAULT_VIEWER_TOOLS: ViewerToolId[] = [
	PAN_TOOL,
	'polygon',
	'rectangle',
	'freehand',
	BRUSH_TOOL,
	RULER_TOOL,
	CALIBRATE_TOOL,
]
