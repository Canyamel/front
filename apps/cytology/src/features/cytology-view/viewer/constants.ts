import { BRUSH_TOOL, CALIBRATE_TOOL, PAN_TOOL, RULER_TOOL } from '@medml/viewers'
import type { ViewerToolId, ViewerZoomLimits } from '@medml/viewers'

/**
 * Инструменты, доступные врачу на снимке цитологии. Рисование — Annotorious 3 (`rectangle`,
 * `polygon`), остальное обслуживает сам вьюер.
 */
export const CYTOLOGY_VIEWER_TOOLS: ViewerToolId[] = [
	PAN_TOOL,
	'rectangle',
	'polygon',
	BRUSH_TOOL,
	RULER_TOOL,
	CALIBRATE_TOOL,
]

/**
 * Снимки цитологии — гигапиксельные WSI: потолок «×10 от вписанного» для них
 * слишком низкий. Ограничиваем только плотностью: до 4 экранных пикселей на
 * пиксель исходника. Зум показываем кратностью к исходному разрешению.
 */
export const CYTOLOGY_ZOOM_LIMITS: ViewerZoomLimits = { maxZoomLevel: null, maxZoomPixelRatio: 4 }
