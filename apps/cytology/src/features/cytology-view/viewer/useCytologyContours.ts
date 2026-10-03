import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { ViewerAnnotationChange, ViewerAnnotationStyleFn, ViewerLegendItem } from '@medml/viewers'

import { segmentsTranslated, type ISegmentStack, type SegmentType } from '../core/types/segments'
import type { CytologyContourDraft, CytologyContourDrafts } from '../model/types'
import {
	buildCytologyAnnotations,
	createCytologyAnnotationStyle,
	FALLBACK_SEGMENT_COLOR,
	type CytologyAnnotation,
	type CytologyAnnotationData,
} from './cytologyAnnotations'

const NO_DRAFTS: ReadonlyMap<string, CytologyContourDraft> = new Map()

export interface UseCytologyContoursOptions {
	segments: ISegmentStack[]
	drafts?: CytologyContourDrafts
	currentType: SegmentType | null
	annotationsVisible: boolean
	segmentTypeColors: Record<string, string>
}

export interface UseCytologyContoursResult {
	annotations: CytologyAnnotation[]
	onChange: (change: ViewerAnnotationChange<CytologyAnnotationData>) => void
	style: ViewerAnnotationStyleFn<CytologyAnnotationData>
	createData: () => CytologyAnnotationData
	legendItems: ViewerLegendItem[]
}

/**
 * Сегменты цитологии для общего вьюера: сегменты сервера с наложенным черновиком на входе,
 * правки врача в черновик на выходе. Своей копии разметки у хука нет.
 *
 * На снимке — сегменты выбранного типа. Новый контур получает этот тип.
 */
export function useCytologyContours({
	segments,
	drafts,
	currentType,
	annotationsVisible,
	segmentTypeColors,
}: UseCytologyContoursOptions): UseCytologyContoursResult {
	const draftMap = drafts?.drafts ?? NO_DRAFTS
	const isEditing = drafts != null

	const displayed = useMemo(
		() => buildCytologyAnnotations(segments, draftMap, currentType),
		[segments, draftMap, currentType],
	)

	const latest = useRef({ drafts, currentType })
	useLayoutEffect(() => {
		latest.current = { drafts, currentType }
	})

	const onChange = useCallback(({ type, annotation }: ViewerAnnotationChange<CytologyAnnotationData>) => {
		const { drafts, currentType } = latest.current
		const segType = annotation.data?.seg_type ?? currentType
		if (!drafts || !segType) return

		const points = annotation.points.map(point => ({ x: point.x, y: point.y }))
		if (type === 'create') drafts.create(annotation.id, points, { segType })
		else if (type === 'update') drafts.update(annotation.id, points, { segType })
		else drafts.remove(annotation.id, { segType })
	}, [])

	// Только что нарисованный контур сразу красится в цвет выбранного типа.
	const createData = useCallback(
		(): CytologyAnnotationData => ({
			ai: false,
			draft: 'create',
			seg_type: latest.current.currentType ?? undefined,
		}),
		[],
	)

	const style = useMemo(
		() => createCytologyAnnotationStyle(segmentTypeColors, { isEditing, activeType: currentType }),
		[segmentTypeColors, isEditing, currentType],
	)

	/**
	 * Легенда: какие типы сейчас на снимке, каким цветом и сколько их.
	 * Помеченные на удаление не считаем.
	 */
	const legendItems = useMemo<ViewerLegendItem[]>(() => {
		const countByType = new Map<SegmentType, number>()
		displayed.forEach(({ data }) => {
			if (!data?.seg_type || data.draft === 'delete') return
			countByType.set(data.seg_type, (countByType.get(data.seg_type) ?? 0) + 1)
		})
		return Array.from(countByType, ([segType, count]) => ({
			id: segType,
			color: segmentTypeColors[segType] ?? FALLBACK_SEGMENT_COLOR,
			title: segmentsTranslated[segType] ?? segType,
			badge: String(count),
		}))
	}, [displayed, segmentTypeColors])

	const annotations = annotationsVisible ? displayed : NO_ANNOTATIONS

	return { annotations, onChange, style, createData, legendItems }
}

const NO_ANNOTATIONS: CytologyAnnotation[] = []
