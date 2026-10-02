import type { PlanePoint, ViewerAnnotation, ViewerImage } from '@medml/viewers'
import type { Segment, SegmentPoint } from '../model/types'
import { getStructureFrame, type ThyroidStructureJson } from '../structures'
import { STRUCTURE_KEY_SEPARATOR } from '../model/segmentation'
import { NODE_COLORS } from './constants'

export function formatProbability(value?: number): string {
	return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '—'
}

export function getProbabilityValue(segment: { details?: unknown } | undefined, keys: string[]): number | undefined {
	const details = (segment?.details || {}) as Record<string, number | undefined>
	for (const key of keys) {
		const value = details[key]
		if (typeof value === 'number') {
			return value
		}
	}
	return undefined
}

export interface ThyroidAnnotationProps {
	kind: 'node' | 'structure'
	color: string
	group?: string
	displayIndex?: number
	tirads?: string | number
	isAi?: boolean
	/**
	 * id контура на бэкенде. Один контур трекинга лежит на нескольких кадрах
	 * (точки с разным `z`), а аннотация — его срез на одном кадре.
	 */
	contourId?: string
	/** Кадр, к которому относится аннотация. */
	page?: number
	probabilities?: Record<string, string>
	label?: string
	confidence?: number
}

/** Контур на снимке УЗИ: узел или структура ЩЖ. */
export type ThyroidAnnotation = ViewerAnnotation<ThyroidAnnotationProps>

/** Точки контура в формате бэкенда: `z` — номер кадра. */
export function getAnnotationPoints(annotation: ThyroidAnnotation, pageIndex: number): SegmentPoint[] {
	return annotation.points.map(point => ({ x: Math.round(point.x), y: Math.round(point.y), z: pageIndex }))
}

/** Контур для вьюера. Структуры ЩЖ только для просмотра — их не правят. */
export function buildPolygonAnnotation(
	id: string,
	points: PlanePoint[] | number[][],
	properties: ThyroidAnnotationProps,
): ThyroidAnnotation {
	return {
		id,
		points: points.map(point => (Array.isArray(point) ? { x: point[0], y: point[1] } : { x: point.x, y: point.y })),
		data: properties,
		editable: properties.kind !== 'structure',
	}
}

export const STRUCTURE_ANNOTATION_ID_PREFIX = 'structure_'

export const isStructureAnnotationId = (id: unknown): boolean =>
	String(id ?? '').startsWith(STRUCTURE_ANNOTATION_ID_PREFIX)

const STRUCTURE_LABELS: Record<string, string> = {
	left_lobe: 'Левая доля',
	right_lobe: 'Правая доля',
	isthmus: 'Перешеек',
}

const STRUCTURE_COLORS: Record<string, string> = {
	right_lobe: '#5DADE2',
	left_lobe: '#48C9B0',
	isthmus: '#C39BD3',
}
const STRUCTURE_FALLBACK_COLOR = '#AAB7B8'

const structureBaseName = (key: string): string => key.split(STRUCTURE_KEY_SEPARATOR)[0]

export interface StructureLegendItem {
	key: string
	label: string
	color: string
	/** Достоверность модели, 0..1; `undefined`, если бэкенд не прислал. */
	confidence?: number
}

/** Структуры ЩЖ, контур которых есть на кадре, — для легенды. */
export function buildStructureLegendItems(
	structures: ThyroidStructureJson | undefined,
	pageIndex: number,
): StructureLegendItem[] {
	const pageData = getStructureFrame(structures, pageIndex)
	if (!pageData) return []
	return Object.entries(pageData)
		.filter(([, details]) => (details?.coords?.length ?? 0) >= 3)
		.map(([key, details]) => {
			const base = structureBaseName(key)
			return {
				key,
				label: STRUCTURE_LABELS[base] || base,
				color: STRUCTURE_COLORS[base] ?? STRUCTURE_FALLBACK_COLOR,
				confidence: details.confidence,
			}
		})
}

/** Аннотации контуров структур ЩЖ (доли, перешеек) для одной страницы снимка. */
export function buildStructureAnnotationsForPage(
	structures: ThyroidStructureJson | undefined,
	pageIndex: number,
): ThyroidAnnotation[] {
	const pageData = getStructureFrame(structures, pageIndex)
	if (!pageData) return []

	return Object.entries(pageData).flatMap(([structureName, details]) => {
		if (!details?.coords || details.coords.length < 3) return []
		const base = structureBaseName(structureName)

		return [
			buildPolygonAnnotation(`${STRUCTURE_ANNOTATION_ID_PREFIX}${structureName}_page_${pageIndex}`, details.coords, {
				kind: 'structure',
				color: STRUCTURE_COLORS[base] ?? STRUCTURE_FALLBACK_COLOR,
				label: STRUCTURE_LABELS[base] || base,
				confidence: details.confidence,
			}),
		]
	})
}

/** Аннотации узлов (segments), сгруппированные по страницам снимка. */
export function buildSegmentAnnotationsByPage(
	segments: Segment[] | undefined,
	images: ViewerImage[],
): Record<number, ThyroidAnnotation[]> {
	const actualPages = images.length || 1
	const pageAnnotationsMap: Record<number, ThyroidAnnotation[]> = {}
	for (let i = 0; i < actualPages; i++) {
		pageAnnotationsMap[i] = []
	}

	if (!segments || segments.length === 0) return pageAnnotationsMap

	segments.forEach((segment, segmentIndex) => {
		if (!segment.data) return

		const properties: ThyroidAnnotationProps = {
			kind: 'node',
			color: NODE_COLORS[segmentIndex % NODE_COLORS.length],
			group: segment.id.toString(),
			displayIndex: segmentIndex + 1,
			tirads: segment.details?.nodule_type ?? undefined,
		}
		const probabilities = {
			'TI-RADS 2': formatProbability(getProbabilityValue(segment, ['nodule_2', 'tirads_2'])),
			'TI-RADS 3': formatProbability(getProbabilityValue(segment, ['nodule_3', 'tirads_3'])),
			'TI-RADS 4': formatProbability(segment.details?.nodule_4),
			'TI-RADS 5': formatProbability(segment.details?.nodule_5),
		}

		segment.data.forEach((contour, contourIndex) => {
			if (!contour.points) return

			// Признак ИИ у узла общий, а контуры в узле бывают и от врача: их
			// бэкенд сохраняет без `details` (`segment/add` их не принимает),
			// а контуры нейросети — с ними.
			const contourIsAi = Boolean(segment.is_ai) && contour.details != null

			const pointsByPage: Record<number, SegmentPoint[]> = {}
			contour.points.forEach(point => {
				const pageIndex = point.z || 0
				if (pageIndex >= 0 && pageIndex < actualPages) {
					if (!pointsByPage[pageIndex]) {
						pointsByPage[pageIndex] = []
					}
					pointsByPage[pageIndex].push(point)
				}
			})

			Object.entries(pointsByPage).forEach(([pageIndexStr, points]) => {
				if (points.length < 3) return

				const page = parseInt(pageIndexStr)
				const contourId = contour.id != null ? contour.id.toString() : undefined
				// id аннотации уникален на каждом кадре: у контура трекинга один id
				// на все кадры, а Annotorious 3 ломается на повторных id (старая
				// графика остаётся на холсте «призраком» поверх других кадров).
				const id = contourId
					? `${contourId}${CONTOUR_PAGE_SEPARATOR}${page}`
					: `node_${segment.id}_contour_${contourIndex}_page_${page}`

				pageAnnotationsMap[page].push(
					buildPolygonAnnotation(id, points, {
						...properties,
						contourId,
						page,
						isAi: contourIsAi,
						// Вероятности TI-RADS посчитала нейросеть — у контура врача их нет.
						probabilities: contourIsAi ? probabilities : undefined,
					}),
				)
			})
		})
	})

	return pageAnnotationsMap
}

/** Разделитель id контура и кадра в id аннотации: `<contourId>@<кадр>`. */
export const CONTOUR_PAGE_SEPARATOR = '@'

/**
 * Точки сохранённых контуров по id — рабочая копия для правок: правка или
 * удаление на одном кадре меняет только точки этого кадра, а не весь контур.
 */
export function buildContourPoints(segments: Segment[] | undefined): Map<string, SegmentPoint[]> {
	const result = new Map<string, SegmentPoint[]>()
	for (const segment of segments ?? []) {
		for (const contour of segment.data ?? []) {
			if (contour.id != null && contour.points) {
				result.set(contour.id.toString(), contour.points.map(point => ({ ...point, z: point.z || 0 })))
			}
		}
	}
	return result
}

/** Есть ли у контура хотя бы один кадр с полноценным полигоном (≥ 3 точек). */
export function hasDrawableFrame(points: SegmentPoint[]): boolean {
	const counts = new Map<number, number>()
	return points.some(point => {
		const page = point.z || 0
		const count = (counts.get(page) ?? 0) + 1
		counts.set(page, count)
		return count >= 3
	})
}

export interface UniqueNode {
	id: number
	displayIndex: number
	type: number | string
	color: string
	/**
	 * Есть ли контур узла на кадре, для которого строилась легенда.
	 * `true`, если кадр не передан.
	 */
	onPage: boolean
}

/**
 * Есть ли у узла контур, который `buildSegmentAnnotationsByPage` нарисует
 * на кадре `pageIndex` (те же правила: `z || 0` и минимум 3 точки).
 */
export function segmentHasContourOnPage(segment: Segment, pageIndex: number): boolean {
	return (segment.data ?? []).some(contour => {
		let count = 0
		for (const point of contour.points ?? []) {
			if ((point.z || 0) === pageIndex && ++count >= 3) return true
		}
		return false
	})
}

/**
 * Данные для легенды узлов (цвет + TI-RADS тип), без Annotorious-обвязки.
 *
 * В легенде всегда все узлы исследования. Если передан `pageIndex`, у узла
 * проставляется `onPage` — есть ли его контур на этом кадре (в многокадровом
 * снимке узел бывает найден лишь на части кадров); легенда приглушает те,
 * которых на кадре нет. Номер и цвет — по индексу во всём списке, так они
 * совпадают с цветом контура и с подписью «Узел N» в списке узлов.
 */
export function buildUniqueNodes(segments: Segment[] | undefined, pageIndex?: number): UniqueNode[] {
	if (!segments) return []
	return segments.map((segment, index) => ({
		id: segment.id,
		displayIndex: index + 1,
		type: segment.details?.nodule_type ?? '-',
		color: NODE_COLORS[index % NODE_COLORS.length],
		onPage: pageIndex == null || segmentHasContourOnPage(segment, pageIndex),
	}))
}
