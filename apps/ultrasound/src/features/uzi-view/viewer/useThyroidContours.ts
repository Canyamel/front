import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ViewerAnnotationChange, ViewerAnnotationStyleFn, ViewerImage } from '@medml/viewers'

import type { Segment, SegmentDraftChange, SegmentPoint } from '../model/types'
import type { ThyroidStructureJson } from '../structures'
import { NODE_COLORS } from './constants'
import {
	buildContourPoints,
	buildSegmentAnnotationsByPage,
	buildStructureAnnotationsForPage,
	buildStructureLegendItems,
	buildUniqueNodes,
	getAnnotationPoints,
	hasDrawableFrame,
	isStructureAnnotationId,
	type StructureLegendItem,
	type ThyroidAnnotation,
	type ThyroidAnnotationProps,
	type UniqueNode,
} from './thyroidAnnotations'

/** Цвет по умолчанию для контура, у которого ещё нет узла. */
const FALLBACK_NODE_COLOR = '#FF0000'

export interface UseThyroidContoursOptions {
	images: ViewerImage[]
	seg: Segment[]
	currentPage: number
	annotationsVisible: boolean
	structuresVisible?: boolean
	/** Узел, к которому привязывается новый контур. */
	currentGroup?: string | number
	thyroidStructures?: ThyroidStructureJson
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
}

export interface UseThyroidContoursResult {
	/** Контуры текущего кадра для вьюера. */
	annotations: ThyroidAnnotation[]
	onChange: (change: ViewerAnnotationChange<ThyroidAnnotationProps>) => void
	style: ViewerAnnotationStyleFn<ThyroidAnnotationProps>
	createData: () => ThyroidAnnotationProps
	uniqueNodes: UniqueNode[]
	structureItems: StructureLegendItem[]
	hasStructures: boolean
}

/**
 * Контуры УЗИ ЩЖ для общего вьюера: узлы по кадрам и структуры ЩЖ на входе,
 * черновики изменений для сохранения на выходе.
 *
 * С Annotorious хук не работает — им управляет `@medml/viewers`. Здесь только
 * доменное:
 *
 * - контур трекинга лежит на нескольких кадрах (точки с разным `z`), а на
 *   экране — его срез на одном кадре. Правка или удаление на кадре меняет
 *   точки только этого кадра, иначе сохранение затёрло бы остальные кадры;
 * - новый контур привязывается к выбранному узлу и красится в его цвет;
 * - структуры ЩЖ только для просмотра, на бэкенд они не уходят.
 */
export function useThyroidContours({
	images,
	seg,
	currentPage,
	annotationsVisible,
	structuresVisible = true,
	currentGroup,
	thyroidStructures,
	onDraftChangesChange,
}: UseThyroidContoursOptions): UseThyroidContoursResult {
	/**
	 * Разметка с сервера. После сохранения снимок перечитывается, и она
	 * пересобирается с серверными id. Карты внутри — рабочие копии, правки
	 * врача пишутся прямо в них.
	 */
	const base = useMemo(() => buildContourState(seg, images), [seg, images])
	const baseRef = useRef(base)

	/** Контуры по кадрам с правками врача; относятся к своей `base`. */
	const [edited, setEdited] = useState<{ base: ContourState; byPage: PageAnnotations } | null>(null)
	const pageAnnotations = edited?.base === base ? edited.byPage : base.byPage

	const draftChangesRef = useRef<SegmentDraftChange[]>([])

	const currentPageRef = useRef(currentPage)
	const currentGroupRef = useRef(currentGroup)
	const onDraftChangesChangeRef = useRef(onDraftChangesChange)
	useLayoutEffect(() => {
		baseRef.current = base
		currentPageRef.current = currentPage
		currentGroupRef.current = currentGroup
		onDraftChangesChangeRef.current = onDraftChangesChange
	})

	/** Цвет узла по id группы. */
	const groupColors = useMemo(
		() => new Map(seg.map((segment, index) => [String(segment.id), NODE_COLORS[index % NODE_COLORS.length]])),
		[seg],
	)

	/** Убрать контур со всех кадров и, если задан, положить на кадр `page`. */
	const placeAnnotation = useCallback((annotationId: string, annotation?: ThyroidAnnotation, page?: number) => {
		const current = baseRef.current
		if (annotation && page != null) current.annotationPages.set(annotationId, page)
		else current.annotationPages.delete(annotationId)

		setEdited(prev => {
			const source = prev?.base === current ? prev.byPage : current.byPage
			const byPage: PageAnnotations = {}
			Object.entries(source).forEach(([key, list]) => {
				byPage[Number(key)] = list.filter(item => item.id !== annotationId)
			})
			if (annotation && page != null) byPage[page] = [...(byPage[page] ?? []), annotation]
			return { base: current, byPage }
		})
	}, [])

	const syncDraftChanges = useCallback(
		(annotationId: string, type: SegmentDraftChange['type'], points: SegmentPoint[] = [], segmentGroup?: string | number) => {
			const prev = draftChangesRef.current
			const existing = prev.find(change => change.annotationId === annotationId)
			let next = prev.filter(change => change.annotationId !== annotationId)

			if (type === 'delete') {
				// Удалили ещё не сохранённый контур — на бэкенд отправлять нечего.
				if (existing?.type !== 'create') {
					next = [...next, { annotationId, type: 'delete', segment_group: segmentGroup }]
				}
			} else {
				next = [
					...next,
					{ annotationId, type: existing?.type === 'create' ? 'create' : type, points, segment_group: segmentGroup },
				]
			}

			draftChangesRef.current = next
			onDraftChangesChangeRef.current?.(next)
		},
		[],
	)

	const onChange = useCallback(
		({ type, annotation }: ViewerAnnotationChange<ThyroidAnnotationProps>) => {
			if (isStructureAnnotationId(annotation.id)) return
			const props = annotation.data
			const group = props?.group ?? currentGroupRef.current

			const { annotationPages, contourPoints } = baseRef.current

			if (type === 'create') {
				const page = currentPageRef.current
				placeAnnotation(annotation.id, annotation, page)
				syncDraftChanges(annotation.id, 'create', getAnnotationPoints(annotation, page), group)
				return
			}

			const page = props?.page ?? annotationPages.get(annotation.id) ?? currentPageRef.current

			if (type === 'update') {
				const pagePoints = getAnnotationPoints(annotation, page)
				placeAnnotation(annotation.id, annotation, page)

				if (props?.contourId) {
					// Сохранённый контур: меняем точки только этого кадра.
					const points = replacePagePoints(contourPoints.get(props.contourId), page, pagePoints)
					contourPoints.set(props.contourId, points)
					syncDraftChanges(props.contourId, 'update', points, group)
					return
				}
				syncDraftChanges(annotation.id, 'update', pagePoints, group)
				return
			}

			placeAnnotation(annotation.id)
			if (props?.contourId) {
				// Удаление на одном кадре убирает срез контура только с него.
				// Не осталось кадров — удаляем контур целиком.
				const points = replacePagePoints(contourPoints.get(props.contourId), page, [])
				contourPoints.set(props.contourId, points)
				syncDraftChanges(props.contourId, hasDrawableFrame(points) ? 'update' : 'delete', points, group)
				return
			}
			syncDraftChanges(annotation.id, 'delete', [], group)
		},
		[placeAnnotation, syncDraftChanges],
	)

	const createData = useCallback((): ThyroidAnnotationProps => {
		const group = currentGroupRef.current?.toString()
		return { kind: 'node', color: (group && groupColors.get(group)) || FALLBACK_NODE_COLOR, group }
	}, [groupColors])

	/**
	 * Структуры ЩЖ — тонкая линия и почти прозрачная заливка, чтобы их нельзя
	 * было спутать с узлами.
	 */
	const style = useCallback<ViewerAnnotationStyleFn<ThyroidAnnotationProps>>(
		(annotation, { selected }) => {
			const props = annotation.data
			const color = props?.color ?? FALLBACK_NODE_COLOR
			if (props?.kind === 'structure') {
				return { stroke: color, strokeWidth: selected ? 2 : 1.5, strokeOpacity: 0.9, fill: color, fillOpacity: 0.08 }
			}
			return { stroke: color, strokeWidth: selected ? 3 : 2, strokeOpacity: 0.85, fill: color, fillOpacity: 0.3 }
		},
		[],
	)

	const annotations = useMemo<ThyroidAnnotation[]>(
		() => [
			...(structuresVisible ? buildStructureAnnotationsForPage(thyroidStructures, currentPage) : []),
			...(annotationsVisible ? (pageAnnotations[currentPage] ?? []) : []),
		],
		[structuresVisible, thyroidStructures, currentPage, annotationsVisible, pageAnnotations],
	)

	// Легенда — все узлы; отмечаем, какие есть на текущем кадре.
	const uniqueNodes = useMemo(() => buildUniqueNodes(seg, currentPage), [seg, currentPage])
	const structureItems = useMemo(
		() => buildStructureLegendItems(thyroidStructures, currentPage),
		[thyroidStructures, currentPage],
	)
	const hasStructures = useMemo(
		() => Boolean(thyroidStructures && Object.keys(thyroidStructures).some(key => key !== 'view_type')),
		[thyroidStructures],
	)

	return { annotations, onChange, style, createData, uniqueNodes, structureItems, hasStructures }
}

type PageAnnotations = Record<number, ThyroidAnnotation[]>

interface ContourState {
	/** Контуры узлов по кадрам. */
	byPage: PageAnnotations
	/**
	 * На каком кадре контур. Событие правки может прийти уже после смены
	 * кадра (Annotorious досылает её при снятии выделения), поэтому кадр
	 * берём отсюда, а не из текущего.
	 */
	annotationPages: Map<string, number>
	/** Точки сохранённых контуров на всех кадрах — рабочая копия для правок. */
	contourPoints: Map<string, SegmentPoint[]>
}

function buildContourState(seg: Segment[], images: ViewerImage[]): ContourState {
	const byPage = buildSegmentAnnotationsByPage(seg, images)
	const annotationPages = new Map<string, number>()
	Object.entries(byPage).forEach(([page, list]) => list.forEach(item => annotationPages.set(item.id, Number(page))))
	return { byPage, annotationPages, contourPoints: buildContourPoints(seg) }
}

/** Точки контура со всех кадров, где точки кадра `page` заменены на `pagePoints`. */
function replacePagePoints(points: SegmentPoint[] | undefined, page: number, pagePoints: SegmentPoint[]): SegmentPoint[] {
	return [...(points ?? []).filter(point => (point.z || 0) !== page), ...pagePoints]
}
