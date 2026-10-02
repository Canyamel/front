import { ShapeType } from '@annotorious/openseadragon'
import type { ImageAnnotation, PolygonGeometry, RectangleGeometry } from '@annotorious/openseadragon'

import type { PlanePoint } from '../geometry'
import type { ViewerAnnotation } from './types'

/**
 * Перевод между контуром приложения (`ViewerAnnotation`) и аннотацией
 * Annotorious 3. Доменные данные лежат в `properties` — Annotorious их не
 * трогает и не шлёт событий при их смене.
 */

export interface StoredProperties<D = unknown> {
	data?: D
	editable?: boolean
}

export type StoredAnnotation<D = unknown> = ImageAnnotation & { properties?: StoredProperties<D> }

type AnyGeometry = Partial<PolygonGeometry> & Partial<RectangleGeometry>

export function toStoredAnnotation<D>(annotation: ViewerAnnotation<D>): StoredAnnotation<D> {
	const coords = annotation.points.map(point => [point.x, point.y])
	const xs = coords.map(([x]) => x)
	const ys = coords.map(([, y]) => y)

	return {
		id: annotation.id,
		bodies: [],
		properties: { data: annotation.data, editable: annotation.editable },
		target: {
			annotation: annotation.id,
			selector: {
				type: ShapeType.POLYGON,
				geometry: {
					points: coords,
					// По `bounds` Annotorious делает hit-test — без них контур не выделить.
					bounds: {
						minX: Math.min(...xs),
						minY: Math.min(...ys),
						maxX: Math.max(...xs),
						maxY: Math.max(...ys),
					},
				} as PolygonGeometry,
			},
		},
	}
}

/** Вершины контура; прямоугольник разворачивается в четыре угла. */
export function pointsFromStored(annotation: ImageAnnotation | undefined): PlanePoint[] {
	const geometry = annotation?.target?.selector?.geometry as AnyGeometry | undefined
	if (!geometry) return []

	if (Array.isArray(geometry.points)) {
		return geometry.points.map(([x, y]) => ({ x: Math.round(x), y: Math.round(y) }))
	}

	const { x, y, w, h } = geometry
	if (x == null || y == null || w == null || h == null) return []

	return [
		{ x: Math.round(x), y: Math.round(y) },
		{ x: Math.round(x + w), y: Math.round(y) },
		{ x: Math.round(x + w), y: Math.round(y + h) },
		{ x: Math.round(x), y: Math.round(y + h) },
	]
}

export function fromStoredAnnotation<D>(annotation: StoredAnnotation<D>): ViewerAnnotation<D> {
	return {
		id: annotation.id,
		points: pointsFromStored(annotation),
		data: annotation.properties?.data,
		editable: annotation.properties?.editable,
	}
}

/**
 * Отпечаток контура для сравнения: точки с округлением до пикселя плюс
 * доменные данные. Округление — потому что приложение хранит целые
 * координаты, а Annotorious после правки отдаёт дробные.
 */
export function annotationSignature(annotation: ViewerAnnotation<unknown>): string {
	const points = annotation.points.map(point => `${Math.round(point.x)},${Math.round(point.y)}`).join(' ')
	return `${points}|${annotation.editable === false ? 0 : 1}|${JSON.stringify(annotation.data ?? null)}`
}

/** Верхний правый угол контура — сюда привязывается карточка. */
export function annotationAnchor(points: PlanePoint[]): PlanePoint | null {
	if (points.length === 0) return null
	return {
		x: Math.max(...points.map(point => point.x)),
		y: Math.min(...points.map(point => point.y)),
	}
}
