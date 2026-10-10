import type { Segment, SegmentPoint } from './types'
import type {
	ThyroidStructureFrame,
	ThyroidStructureJson,
} from '../structures'

/**
 * Бэкенд отдаёт в `segmentation` не только узлы: ML-воркер сохраняет туда же
 * контуры долей и перешейка ЩЖ (`details.source_type === 'thyroid_anatomy'`).
 * На бэкенде их отсекают (см. `reporting.py`), клиент должен делать то же
 * самое — иначе анатомия показывается как лишние «узлы» без TI-RADS.
 */
export const THYROID_ANATOMY_SOURCE_TYPE = 'thyroid_anatomy'

/**
 * Разделитель между именем структуры и id группы в ключе кадра. Нужен, если
 * на одном кадре окажутся две группы с одинаковым `structure_type`.
 */
export const STRUCTURE_KEY_SEPARATOR = '__'

export const isAnatomySegment = (segment: Segment): boolean =>
	segment.details?.source_type === THYROID_ANATOMY_SOURCE_TYPE

/** Структуры ЩЖ, по контурам которых бэкенд считает размеры железы. */
const MEASURABLE_STRUCTURES = ['left_lobe', 'right_lobe', 'isthmus']

/** Есть ли контуры структур ЩЖ, по которым бэкенд может посчитать размеры. */
export function hasMeasurableAnatomy(anatomy: Segment[] | undefined): boolean {
	return (anatomy ?? []).some(
		segment =>
			MEASURABLE_STRUCTURES.includes(String(segment.details?.structure_type)) &&
			(segment.data ?? []).some(contour => (contour.points?.length ?? 0) >= 3),
	)
}

export interface SplitSegmentation {
	nodules: Segment[]
	anatomy: Segment[]
}

export function splitSegmentation(
	segmentation: Segment[] | undefined,
): SplitSegmentation {
	const nodules: Segment[] = []
	const anatomy: Segment[] = []
	for (const segment of segmentation ?? []) {
		if (isAnatomySegment(segment)) anatomy.push(segment)
		else nodules.push(segment)
	}
	return { nodules, anatomy }
}

/**
 * Перекладывает анатомические группы в формат, который рисует вьюер
 * (`buildStructureAnnotationsForPage`):
 * `{ view_type, [кадр]: { [структура]: { confidence, coords } } }`.
 *
 * Номер кадра берётся из `point.z` (воркер пишет туда `source_frame`),
 * а если точки без z — из `details.source_frame`.
 */
export function anatomyToStructureJson(
	anatomy: Segment[],
): ThyroidStructureJson | undefined {
	if (!anatomy.length) return undefined

	const result: ThyroidStructureJson = {
		view_type: String(anatomy[0].details?.view_type ?? ''),
	}

	for (const segment of anatomy) {
		const details = segment.details ?? {}
		const name =
			details.structure_type || `structure${STRUCTURE_KEY_SEPARATOR}${segment.id}`
		const fallbackFrame = details.source_frame ?? 0

		for (const contour of segment.data ?? []) {
			const byFrame = new Map<number, SegmentPoint[]>()
			for (const point of contour.points ?? []) {
				const frame = point.z ?? fallbackFrame
				const list = byFrame.get(frame)
				if (list) list.push(point)
				else byFrame.set(frame, [point])
			}

			byFrame.forEach((points, frame) => {
				if (points.length < 3) return
				const key = String(frame)
				const current = result[key]
				const frameData: ThyroidStructureFrame =
					typeof current === 'object' && current ? current : {}

				const structureKey = frameData[name]
					? `${name}${STRUCTURE_KEY_SEPARATOR}${segment.id}${STRUCTURE_KEY_SEPARATOR}${contour.id ?? ''}`
					: name

				frameData[structureKey] = {
					confidence: details.confidence,
					coords: points.map(p => [p.x, p.y] as [number, number]),
				}
				result[key] = frameData
			})
		}
	}

	return result
}
