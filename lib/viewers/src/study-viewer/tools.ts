import type React from 'react'

/**
 * Единый набор инструментов рабочего места врача.
 * Здесь идентификаторы общие, а какие из них доступны — решает приложение
 * через `tools` у `<AnnotatedStudyViewer />`.
 */

export const PAN_TOOL = 'pan' as const

export const BRUSH_TOOL = 'brush' as const

export const RULER_TOOL = 'ruler' as const

export const CALIBRATE_TOOL = 'calibrate' as const

/**
 * Инструменты рисования — их обрабатывает слой разметки приложения
 * (`ViewerAnnotationLayer`), а не сам вьюер.
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
export const OVERLAY_TOOLS: ViewerToolId[] = [PAN_TOOL, BRUSH_TOOL, RULER_TOOL, CALIBRATE_TOOL]

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
	hint: string
	icon?: React.ReactNode
}

/**
 * Подписи инструментов.
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
