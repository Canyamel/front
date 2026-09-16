import type { SegmentPoint } from '../model/types'

/**
 * Доменно-специфичные измерения контуров УЗИ.
 *
 * Общая математика отрезков и перевод px↔мм вынесены в `@medml/viewers`
 * (`measurement-tools`) — здесь остаётся только то, что завязано на
 * `SegmentPoint` конкретной модели данных УЗИ.
 */

/** Габариты контура в пикселях изображения. */
export interface ContourSize {
	widthPx: number
	heightPx: number
}

/**
 * Достаёт отрезок из аннотации инструмента «линия» (selector-pack рисует
 * `<line x1 y1 x2 y2>` внутри SvgSelector).
 */
export function parseLineAnnotation(annotation: unknown): { x1: number; y1: number; x2: number; y2: number } | null {
	const value = (annotation as { target?: { selector?: { value?: unknown } } })
		?.target?.selector?.value

	if (typeof value !== 'string') return null

	const read = (attr: string): number | null => {
		const match = new RegExp(`${attr}\\s*=\\s*"(-?[\\d.]+)"`).exec(value)
		return match ? Number.parseFloat(match[1]) : null
	}

	const x1 = read('x1')
	const y1 = read('y1')
	const x2 = read('x2')
	const y2 = read('y2')

	if (x1 == null || y1 == null || x2 == null || y2 == null) return null
	if ([x1, y1, x2, y2].some(Number.isNaN)) return null

	return { x1, y1, x2, y2 }
}

/** Габариты контура по ограничивающему прямоугольнику. */
export function contourSizePx(points: SegmentPoint[]): ContourSize | null {
	if (!points || points.length === 0) return null

	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const point of points) {
		minX = Math.min(minX, point.x)
		minY = Math.min(minY, point.y)
		maxX = Math.max(maxX, point.x)
		maxY = Math.max(maxY, point.y)
	}

	if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

	return { widthPx: maxX - minX, heightPx: maxY - minY }
}

/**
 * Наибольшие габариты узла по всем его контурам.
 * У узла может быть несколько контуров (на разных кадрах) — берём максимум,
 * это и есть размер образования, который врач вносит в заключение.
 */
export function segmentSizePx(
	contours: Array<{ points: SegmentPoint[] }> | undefined,
): ContourSize | null {
	if (!contours || contours.length === 0) return null

	let widthPx = 0
	let heightPx = 0
	let found = false

	for (const contour of contours) {
		const size = contourSizePx(contour.points)
		if (!size) continue
		found = true
		widthPx = Math.max(widthPx, size.widthPx)
		heightPx = Math.max(heightPx, size.heightPx)
	}

	return found ? { widthPx, heightPx } : null
}

export { lineLengthPx, lineMidpoint, lineAngleDeg, lineLabelAnchor, calcPxPerMm, pxToMm, formatMm } from '@medml/viewers'
export type { MeasuredLine } from '@medml/viewers'
