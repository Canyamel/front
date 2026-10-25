import type { PlanePoint, ViewerAnnotation, ViewerImage } from '@medml/viewers'
import type { Segment, SegmentContour, SegmentDetails, SegmentPoint, UziContourDraft } from '../model/types'
import { getStructureFrame, type ThyroidStructureJson } from '../structures'
import { STRUCTURE_KEY_SEPARATOR } from '../model/segmentation'
import { NODE_COLORS } from './constants'
import { isClassSetByDoctor } from '../model/noduleClass'

export function formatProbability(value?: number): string {
	return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '—'
}

/** Уверенность детектора в узле для карточки контура. */
export interface DetectionConfidence {
	/** 0..1 */
	value: number
	/** `frame` — на этом кадре; `mean` — средняя по кадрам, где узел найден. */
	scope: 'frame' | 'mean'
}

export function getDetectionConfidence(
	details: SegmentDetails | undefined,
	page: number,
): DetectionConfidence | undefined {
	const onFrame = details?.detection_confidences?.[String(page)]
	if (typeof onFrame === 'number' && Number.isFinite(onFrame)) return { value: onFrame, scope: 'frame' }
	const mean = details?.detection_confidence
	if (typeof mean === 'number' && Number.isFinite(mean)) return { value: mean, scope: 'mean' }
	return undefined
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

/** Доменные данные контура на снимке УЗИ: по ним строятся стиль и карточка. */
export interface UziAnnotationData {
	kind: 'node' | 'structure'
	color: string
	group?: string
	displayIndex?: number
	tirads?: string | number
	tiradsByDoctor?: boolean
	isAi?: boolean
	contourId?: string
	page?: number
	probabilities?: Record<string, string>
	detectionConfidence?: DetectionConfidence
	label?: string
	confidence?: number
}

/** Контур на снимке УЗИ: узел или структура ЩЖ. */
export type UziAnnotation = ViewerAnnotation<UziAnnotationData>

/** Точки контура в формате бэкенда: `z` — номер кадра. */
export function getAnnotationPoints(annotation: UziAnnotation, pageIndex: number): SegmentPoint[] {
	return annotation.points.map(point => ({ x: Math.round(point.x), y: Math.round(point.y), z: pageIndex }))
}

/** Контур для вьюера. Структуры ЩЖ только для просмотра — их не правят. */
export function buildPolygonAnnotation(
	id: string,
	points: PlanePoint[] | number[][],
	properties: UziAnnotationData,
): UziAnnotation {
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
): UziAnnotation[] {
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

/**
 * Контур в том виде, в каком его показывает вьюер: с сервера или из
 * черновика. У нового контура `id` с бэкенда ещё нет, вместо него — ключ
 * черновика (он же id контура во вьюере).
 */
export interface DisplayContour extends SegmentContour {
	draftKey?: string
}

export interface DisplaySegment extends Omit<Segment, 'data'> {
	data?: DisplayContour[]
}

/**
 * Узлы с наложенным черновиком: изменённые контуры — с новыми точками,
 * удалённые — без них, новые — в своём узле.
 */
export function applyUziContourDrafts(
	segments: Segment[],
	drafts: ReadonlyMap<string, UziContourDraft>,
): DisplaySegment[] {
	if (drafts.size === 0) return segments

	const created = new Map<string, DisplayContour[]>()
	drafts.forEach((draft, key) => {
		if (draft.kind !== 'create' || draft.data?.group == null) return
		const group = String(draft.data.group)
		created.set(group, [...(created.get(group) ?? []), { draftKey: key, points: draft.points }])
	})

	return segments.map(segment => {
		const data: DisplayContour[] = []
		for (const contour of segment.data ?? []) {
			const draft = contour.id != null ? drafts.get(String(contour.id)) : undefined
			if (draft?.kind === 'delete') continue
			data.push(draft?.kind === 'update' ? { ...contour, points: draft.points } : contour)
		}
		data.push(...(created.get(String(segment.id)) ?? []))
		return { ...segment, data }
	})
}

/** Аннотации узлов (segments), сгруппированные по страницам снимка. */
export function buildSegmentAnnotationsByPage(
	segments: DisplaySegment[] | undefined,
	images: ViewerImage[],
): Record<number, UziAnnotation[]> {
	const actualPages = images.length || 1
	const pageAnnotationsMap: Record<number, UziAnnotation[]> = {}
	for (let i = 0; i < actualPages; i++) {
		pageAnnotationsMap[i] = []
	}

	if (!segments || segments.length === 0) return pageAnnotationsMap

	segments.forEach((segment, segmentIndex) => {
		if (!segment.data) return

		const properties: UziAnnotationData = {
			kind: 'node',
			color: NODE_COLORS[segmentIndex % NODE_COLORS.length],
			group: segment.id.toString(),
			displayIndex: segmentIndex + 1,
			tirads: segment.details?.nodule_type ?? undefined,
			tiradsByDoctor: isClassSetByDoctor(segment),
		}
		const probabilities = {
			'TI-RADS 2': formatProbability(getProbabilityValue(segment, ['nodule_2', 'tirads_2'])),
			'TI-RADS 3': formatProbability(getProbabilityValue(segment, ['nodule_3', 'tirads_3'])),
			'TI-RADS 4': formatProbability(segment.details?.nodule_4),
			'TI-RADS 5': formatProbability(segment.details?.nodule_5),
		}

		segment.data.forEach((contour, contourIndex) => {
			if (!contour.points) return

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
				// Новый контур лежит на одном кадре, и его id — ключ черновика:
				// так вьюер не перерисовывает только что нарисованный контур.
				const id = contourId
					? `${contourId}${CONTOUR_PAGE_SEPARATOR}${page}`
					: (contour.draftKey ?? `node_${segment.id}_contour_${contourIndex}_page_${page}`)

				const annotation = buildPolygonAnnotation(id, points, {
					...properties,
					contourId,
					page,
					isAi: contourIsAi,
					probabilities: contourIsAi ? probabilities : undefined,
					detectionConfidence: contourIsAi ? getDetectionConfidence(segment.details, page) : undefined,
				})
				if (!contourId && !contour.draftKey) annotation.editable = false
				pageAnnotationsMap[page].push(annotation)
			})
		})
	})

	return pageAnnotationsMap
}

/** Разделитель id контура и кадра в id аннотации: `<contourId>@<кадр>`. */
export const CONTOUR_PAGE_SEPARATOR = '@'

/**
 * Точки сохранённых контуров по id: правка или удаление на одном кадре
 * меняет только точки этого кадра, остальные берутся отсюда.
 */
export function buildContourPoints(segments: Segment[] | undefined): Map<string, SegmentPoint[]> {
	const result = new Map<string, SegmentPoint[]>()
	for (const segment of segments ?? []) {
		for (const contour of segment.data ?? []) {
			if (contour.id != null && contour.points) {
				result.set(
					contour.id.toString(),
					contour.points.map(point => ({ ...point, z: point.z || 0 })),
				)
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
	typeByDoctor: boolean
	color: string
	onPage: boolean
}

export function segmentHasContourOnPage(segment: DisplaySegment, pageIndex: number): boolean {
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
 */
export function buildUniqueNodes(segments: DisplaySegment[] | undefined, pageIndex?: number): UniqueNode[] {
	if (!segments) return []
	return segments.map((segment, index) => ({
		id: segment.id,
		displayIndex: index + 1,
		type: segment.details?.nodule_type ?? '-',
		typeByDoctor: isClassSetByDoctor(segment),
		color: NODE_COLORS[index % NODE_COLORS.length],
		onPage: pageIndex == null || segmentHasContourOnPage(segment, pageIndex),
	}))
}
