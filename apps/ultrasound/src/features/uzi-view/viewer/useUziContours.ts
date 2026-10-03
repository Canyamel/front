import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { ViewerAnnotationChange, ViewerAnnotationStyleFn, ViewerImage } from '@medml/viewers'

import type { Segment, SegmentPoint, UziContourDrafts } from '../model/types'
import type { ThyroidStructureJson } from '../structures'
import { NODE_COLORS } from './constants'
import {
	applyUziContourDrafts,
	buildContourPoints,
	buildSegmentAnnotationsByPage,
	buildStructureAnnotationsForPage,
	buildStructureLegendItems,
	buildUniqueNodes,
	getAnnotationPoints,
	hasDrawableFrame,
	isStructureAnnotationId,
	type DisplaySegment,
	type StructureLegendItem,
	type UniqueNode,
	type UziAnnotation,
	type UziAnnotationData,
} from './uziAnnotations'

const FALLBACK_NODE_COLOR = '#FF0000'

export interface UseUziContoursOptions {
	images: ViewerImage[]
	segments: Segment[]
	drafts?: UziContourDrafts
	currentPage: number
	annotationsVisible: boolean
	structuresVisible?: boolean
	/** Узел, к которому привязывается новый контур. */
	currentGroup?: string | number
	thyroidStructures?: ThyroidStructureJson
}

export interface UseUziContoursResult {
	annotations: UziAnnotation[]
	onChange: (change: ViewerAnnotationChange<UziAnnotationData>) => void
	style: ViewerAnnotationStyleFn<UziAnnotationData>
	createData: () => UziAnnotationData
	displaySegments: DisplaySegment[]
	uniqueNodes: UniqueNode[]
	structureItems: StructureLegendItem[]
	hasStructures: boolean
}

/**
 * Контуры УЗИ для общего вьюера: узлы сервера с наложенным черновиком и
 * структуры ЩЖ на входе, правки врача в черновик на выходе.
 */
export function useUziContours({
	images,
	segments,
	drafts,
	currentPage,
	annotationsVisible,
	structuresVisible = true,
	currentGroup,
	thyroidStructures,
}: UseUziContoursOptions): UseUziContoursResult {
	const draftMap = drafts?.drafts
	const displaySegments = useMemo(
		() => (draftMap ? applyUziContourDrafts(segments, draftMap) : segments),
		[segments, draftMap],
	)
	const pageAnnotations = useMemo(
		() => buildSegmentAnnotationsByPage(displaySegments, images),
		[displaySegments, images],
	)

	/** Точки сохранённых контуров на всех кадрах — к ним применяется правка кадра. */
	const serverPoints = useMemo(() => buildContourPoints(segments), [segments])

	const latest = useRef({ drafts, serverPoints, currentPage, currentGroup })
	useLayoutEffect(() => {
		latest.current = { drafts, serverPoints, currentPage, currentGroup }
	})

	/** Цвет узла по id группы. */
	const groupColors = useMemo(
		() => new Map(segments.map((segment, index) => [String(segment.id), NODE_COLORS[index % NODE_COLORS.length]])),
		[segments],
	)

	const onChange = useCallback(({ type, annotation }: ViewerAnnotationChange<UziAnnotationData>) => {
		const { drafts, serverPoints, currentPage, currentGroup } = latest.current
		if (!drafts || isStructureAnnotationId(annotation.id)) return

		const data = annotation.data
		const group = data?.group ?? currentGroup
		// Событие правки может прийти уже после смены кадра (Annotorious
		// досылает её при снятии выделения), поэтому кадр — из данных контура.
		const page = data?.page ?? currentPage
		const pagePoints = getAnnotationPoints(annotation, page)
		const contourId = data?.contourId

		if (!contourId) {
			// Новый контур: в черновике под id, который дал ему вьюер.
			if (type === 'create') drafts.create(annotation.id, pagePoints, { group })
			else if (type === 'update') drafts.update(annotation.id, pagePoints, { group })
			else drafts.remove(annotation.id, { group })
			return
		}

		// Сохранённый контур: меняем точки только этого кадра, остальные кадры
		// берём из черновика (если контур уже правили) или с сервера.
		const draft = drafts.getLatest().get(contourId)
		const current = draft?.kind === 'update' ? draft.points : serverPoints.get(contourId)
		const points = replacePagePoints(current, page, type === 'delete' ? [] : pagePoints)

		// Удалили срез на последнем кадре, где контур был, — удаляем контур целиком.
		if (type === 'delete' && !hasDrawableFrame(points)) drafts.remove(contourId, { group })
		else drafts.update(contourId, points, { group })
	}, [])

	const createData = useCallback((): UziAnnotationData => {
		const { currentGroup, currentPage } = latest.current
		const group = currentGroup?.toString()
		return { kind: 'node', color: (group && groupColors.get(group)) || FALLBACK_NODE_COLOR, group, page: currentPage }
	}, [groupColors])

	/**
	 * Структуры ЩЖ — тонкая линия и почти прозрачная заливка, чтобы их нельзя
	 * было спутать с узлами.
	 */
	const style = useCallback<ViewerAnnotationStyleFn<UziAnnotationData>>((annotation, { selected }) => {
		const data = annotation.data
		const color = data?.color ?? FALLBACK_NODE_COLOR
		if (data?.kind === 'structure') {
			return { stroke: color, strokeWidth: selected ? 2 : 1.5, strokeOpacity: 0.9, fill: color, fillOpacity: 0.08 }
		}
		return { stroke: color, strokeWidth: selected ? 3 : 2, strokeOpacity: 0.85, fill: color, fillOpacity: 0.3 }
	}, [])

	const annotations = useMemo<UziAnnotation[]>(
		() => [
			...(structuresVisible ? buildStructureAnnotationsForPage(thyroidStructures, currentPage) : []),
			...(annotationsVisible ? (pageAnnotations[currentPage] ?? []) : []),
		],
		[structuresVisible, thyroidStructures, currentPage, annotationsVisible, pageAnnotations],
	)

	// Легенда — все узлы; отмечаем, какие есть на текущем кадре.
	const uniqueNodes = useMemo(() => buildUniqueNodes(displaySegments, currentPage), [displaySegments, currentPage])
	const structureItems = useMemo(
		() => buildStructureLegendItems(thyroidStructures, currentPage),
		[thyroidStructures, currentPage],
	)
	const hasStructures = useMemo(
		() => Boolean(thyroidStructures && Object.keys(thyroidStructures).some(key => key !== 'view_type')),
		[thyroidStructures],
	)

	return { annotations, onChange, style, createData, displaySegments, uniqueNodes, structureItems, hasStructures }
}

/** Точки контура со всех кадров, где точки кадра `page` заменены на `pagePoints`. */
function replacePagePoints(
	points: SegmentPoint[] | undefined,
	page: number,
	pagePoints: SegmentPoint[],
): SegmentPoint[] {
	return [...(points ?? []).filter(point => (point.z || 0) !== page), ...pagePoints]
}
