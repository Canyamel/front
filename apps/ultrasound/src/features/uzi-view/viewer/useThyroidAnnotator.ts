import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UserSelectAction, createOSDAnnotator } from '@annotorious/openseadragon'
import type {
	AnnotationState,
	DrawingStyle,
	ImageAnnotation,
	OpenSeadragonAnnotator,
	Selection,
} from '@annotorious/openseadragon'
import '@annotorious/openseadragon/annotorious-openseadragon.css'
import type { PlanePoint, ViewerAnnotationLayer, ViewerImage, ViewerInstance, ViewerToolId } from '@medml/viewers'
import { isDrawingTool } from '@medml/viewers'
import type { Segment, SegmentDraftChange, SegmentPoint } from '../model/types'
import type { ThyroidStructureJson } from '../structures'
import { NODE_COLORS } from './constants'
import {
	buildPolygonAnnotation,
	buildSegmentAnnotationsByPage,
	buildStructureAnnotationsForPage,
	buildStructureLegendItems,
	buildUniqueNodes,
	getAnnotationProps,
	getAnnotationPoints,
	isStructureAnnotationId,
	type StructureLegendItem,
	type ThyroidAnnotation,
	type UniqueNode,
} from './thyroidAnnotations'

type Annotator = OpenSeadragonAnnotator<ImageAnnotation, ImageAnnotation>

/** Цвет по умолчанию для контура, у которого ещё нет узла. */
const FALLBACK_NODE_COLOR = '#FF0000'

function applyTool(annotator: Annotator | null, tool: ViewerToolId, drawing: boolean): void {
	if (!annotator) return

	try {
		if (drawing) {
			annotator.setDrawingTool(tool as never)
		}
		annotator.setDrawingEnabled(drawing)
	} catch (error) {
		console.error(`Не удалось включить инструмент «${tool}»:`, error)
	}
}

function makeLocalId(): string {
	return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface UseThyroidAnnotatorOptions {
	images: ViewerImage[]
	seg: Segment[]
	readOnly: boolean
	currentPage: number
	annotationsVisible: boolean
	structuresVisible?: boolean
	currentGroup?: string | number
	thyroidStructures?: ThyroidStructureJson
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
}

export interface UseThyroidAnnotatorResult {
	layer: ViewerAnnotationLayer
	annotator: Annotator | null
	selected: ThyroidAnnotation | null
	removeAnnotation: (id: string) => void
	uniqueNodes: UniqueNode[]
	structureItems: StructureLegendItem[]
	hasStructures: boolean
	flushPendingSelection: () => Promise<void>
}

/**
 * Жизненный цикл Annotorious 3 для результатов УЗИ ЩЖ: подключение к живому
 * инстансу OpenSeadragon, построение аннотаций из доменных данных (узлы +
 * контуры структур, через `thyroidAnnotations.ts`) и перевод
 * create/update/delete в черновики изменений.
 *
 * Наружу хук отдаёт `layer` — реализацию общего контракта
 * `ViewerAnnotationLayer` из `@medml/viewers`. Та же версия Annotorious и тот
 * же подход, что в цитологии (`useCytologyAnnotator`).
 *
 * Особенности Annotorious 3, на которых здесь всё построено:
 *
 * - `clearAnnotations()` рассылает `deleteAnnotation` по всем контурам.
 *   Поэтому кадр меняется только через `setAnnotations(list, true)` — это
 *   «удалённая» загрузка, событий она не шлёт. Иначе смена кадра записала
 *   бы все узлы в черновик на удаление.
 * - `updateAnnotation` приходит, когда с изменённого контура снимается
 *   выделение. Чтобы досохранить правку перед отправкой, достаточно
 *   `cancelSelected()` и дождаться события (`flushPendingSelection`).
 * - Контуры, добавленные через API (`addAnnotation`), `createAnnotation` не
 *   шлют — кисть проводит черновик сама.
 * - Встроенного попапа и удаления по Delete нет: удаление — из карточки
 *   контура (`removeAnnotation`).
 */
export function useThyroidAnnotator({
	images,
	seg,
	readOnly,
	currentPage,
	annotationsVisible,
	structuresVisible = true,
	currentGroup,
	thyroidStructures,
	onDraftChangesChange,
}: UseThyroidAnnotatorOptions): UseThyroidAnnotatorResult {
	const annoRef = useRef<Annotator | null>(null)
	const unsubscribeSelectionRef = useRef<(() => void) | null>(null)
	const [annotator, setAnnotator] = useState<Annotator | null>(null)
	const [selectedId, setSelectedId] = useState<string | null>(null)

	// Обработчики Annotorious вешаются один раз на инстанс, поэтому кадр,
	// видимость и прочее читаются через ref — иначе в замыкании осталось бы
	// значение с момента подписки.
	const currentGroupRef = useRef(currentGroup)
	const currentPageRef = useRef(currentPage)
	const readOnlyRef = useRef(readOnly)
	const annotationsVisibleRef = useRef(annotationsVisible)
	const structuresVisibleRef = useRef(structuresVisible)
	const toolRef = useRef<{ tool: ViewerToolId; drawing: boolean }>({ tool: 'pan', drawing: false })
	const onDraftChangesChangeRef = useRef(onDraftChangesChange)

	/** Контуры узлов по кадрам: источник истины для перерисовки кадра. */
	const pageAnnotationsRef = useRef<Record<number, ThyroidAnnotation[]>>({})
	const pageStructureAnnotationsRef = useRef<Record<number, ThyroidAnnotation[]>>({})
	/**
	 * На каком кадре живёт контур. Событие `updateAnnotation` может прийти
	 * уже после переключения кадра, поэтому кадр берём отсюда, а не из
	 * текущего.
	 */
	const annotationPageRef = useRef<Map<string, number>>(new Map())
	const draftChangesRef = useRef<SegmentDraftChange[]>([])

	/** Цвет узла по id группы — чтобы новый контур сразу красился в цвет узла. */
	const groupColorRef = useRef<Map<string, string>>(new Map())

	useEffect(() => {
		currentGroupRef.current = currentGroup
		currentPageRef.current = currentPage
		readOnlyRef.current = readOnly
		annotationsVisibleRef.current = annotationsVisible
		structuresVisibleRef.current = structuresVisible
		onDraftChangesChangeRef.current = onDraftChangesChange
	}, [currentGroup, currentPage, readOnly, annotationsVisible, structuresVisible, onDraftChangesChange])

	useEffect(() => {
		groupColorRef.current = new Map(
			seg.map((segment, index) => [String(segment.id), NODE_COLORS[index % NODE_COLORS.length]]),
		)
	}, [seg])

	const updateAnnotationsForPage = useCallback((pageIndex: number) => {
		const anno = annoRef.current
		if (!anno) return

		const annotations = [
			...(structuresVisibleRef.current ? pageStructureAnnotationsRef.current[pageIndex] || [] : []),
			...(annotationsVisibleRef.current ? pageAnnotationsRef.current[pageIndex] || [] : []),
		]

		try {
			// replace = true: «удалённая» загрузка без create/delete событий.
			anno.setAnnotations(annotations, true)
		} catch (error) {
			console.error('Не удалось показать разметку кадра:', error)
		}
	}, [])

	const upsertPageAnnotation = useCallback((annotation: ThyroidAnnotation, pageIndex: number) => {
		const next: Record<number, ThyroidAnnotation[]> = {}
		Object.entries(pageAnnotationsRef.current).forEach(([key, value]) => {
			next[Number(key)] = (value || []).filter(item => item.id !== annotation.id)
		})
		next[pageIndex] = [...(next[pageIndex] || []), annotation]
		pageAnnotationsRef.current = next
		annotationPageRef.current.set(annotation.id, pageIndex)
	}, [])

	const removePageAnnotation = useCallback((annotationId: string) => {
		const next: Record<number, ThyroidAnnotation[]> = {}
		Object.entries(pageAnnotationsRef.current).forEach(([key, value]) => {
			next[Number(key)] = (value || []).filter(annotation => annotation.id !== annotationId)
		})
		pageAnnotationsRef.current = next
		annotationPageRef.current.delete(annotationId)
	}, [])

	const syncDraftChanges = useCallback(
		(
			annotationId: string,
			type: SegmentDraftChange['type'],
			points: SegmentPoint[] = [],
			segmentGroup?: string | number,
		) => {
			// Контуры долей/перешейка — только для просмотра, на бэкенд
			// как контуры узлов их отправлять нельзя.
			if (isStructureAnnotationId(annotationId)) return

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
					{
						annotationId,
						type: existing?.type === 'create' ? 'create' : type,
						points,
						segment_group: segmentGroup,
					},
				]
			}

			draftChangesRef.current = next
			onDraftChangesChangeRef.current?.(next)
		},
		[],
	)

	// Контуры структур ЩЖ для текущей страницы.
	useEffect(() => {
		pageStructureAnnotationsRef.current = {
			...pageStructureAnnotationsRef.current,
			[currentPage]: buildStructureAnnotationsForPage(thyroidStructures, currentPage),
		}
		updateAnnotationsForPage(currentPage)
	}, [currentPage, thyroidStructures, updateAnnotationsForPage])

	// Контуры узлов: после сохранения RTK Query перечитывает снимок, и
	// разметка пересобирается с серверными id.
	useEffect(() => {
		const byPage = buildSegmentAnnotationsByPage(seg, images)
		pageAnnotationsRef.current = byPage
		const pages = new Map<string, number>()
		Object.entries(byPage).forEach(([page, list]) => list.forEach(item => pages.set(item.id, Number(page))))
		annotationPageRef.current = pages
		updateAnnotationsForPage(currentPage)
	}, [seg, images, currentPage, updateAnnotationsForPage])

	// Перерисовка при переключении видимости разметки.
	useEffect(() => {
		updateAnnotationsForPage(currentPage)
	}, [annotationsVisible, structuresVisible, currentPage, updateAnnotationsForPage])

	/**
	 * Стиль контура. Невыделенные контуры Annotorious 3 рисует через WebGL,
	 * поэтому CSS до них не достаёт — всё оформление задаётся здесь.
	 * Структуры ЩЖ: тонкая линия и почти прозрачная заливка, чтобы их нельзя
	 * было спутать с узлами.
	 */
	const style = useCallback((annotation: ImageAnnotation, state?: AnnotationState): DrawingStyle => {
		const props = getAnnotationProps(annotation)
		const selected = Boolean(state?.selected)

		if (props?.kind === 'structure') {
			const color = props.color as DrawingStyle['stroke']
			return { stroke: color, strokeWidth: selected ? 2 : 1.5, strokeOpacity: 0.9, fill: color, fillOpacity: 0.08 }
		}

		const group = props?.group ?? findDraftGroup(draftChangesRef.current, annotation.id)
		const color = (props?.color ??
			(group != null ? groupColorRef.current.get(String(group)) : undefined) ??
			FALLBACK_NODE_COLOR) as DrawingStyle['stroke']

		return { stroke: color, strokeWidth: selected ? 3 : 2, strokeOpacity: 0.85, fill: color, fillOpacity: 0.3 }
	}, [])

	/**
	 * Подключение Annotorious к живому инстансу OpenSeadragon. Инстанс
	 * принадлежит `@medml/viewers`; сюда он попадает через контракт слоя.
	 *
	 * Режим просмотра задаётся при создании: `Gallery` монтирует вьюер заново
	 * при входе в редактирование (`key` включает `isEditMode`).
	 */
	const attach = useCallback(
		(viewer: ViewerInstance) => {
			const isReadOnly = readOnlyRef.current

			const instance = createOSDAnnotator<ImageAnnotation, ImageAnnotation>(viewer, {
				drawingEnabled: false,
				// Контур можно выделить, чтобы увидеть карточку узла; править —
				// только узлы и только в режиме редактирования.
				userSelectAction: (annotation: ImageAnnotation) =>
					isReadOnly || getAnnotationProps(annotation)?.kind === 'structure'
						? UserSelectAction.SELECT
						: UserSelectAction.EDIT,
				style,
			})

			annoRef.current = instance
			setAnnotator(instance)
			applyTool(instance, toolRef.current.tool, toolRef.current.drawing)
			updateAnnotationsForPage(currentPageRef.current)

			unsubscribeSelectionRef.current = instance.state.selection.subscribe((selection: Selection) => {
				setSelectedId(selection.selected?.[0]?.id ?? null)
			})

			if (isReadOnly) return

			// Нарисованный контур: вешаем на него текущий узел и заводим черновик.
			instance.on('createAnnotation', (annotation: ImageAnnotation) => {
				try {
					const page = currentPageRef.current
					const group = currentGroupRef.current?.toString()
					const withProps: ThyroidAnnotation = {
						...annotation,
						properties: {
							kind: 'node',
							color: (group && groupColorRef.current.get(group)) || FALLBACK_NODE_COLOR,
							group,
						},
					}
					instance.updateAnnotation(withProps)
					upsertPageAnnotation(withProps, page)
					syncDraftChanges(withProps.id, 'create', getAnnotationPoints(withProps, page), group)
				} catch (error) {
					console.error('Error creating draft annotation:', error)
				}
			})

			instance.on('updateAnnotation', (annotation: ImageAnnotation) => {
				try {
					if (isStructureAnnotationId(annotation.id)) return
					const page = annotationPageRef.current.get(annotation.id) ?? currentPageRef.current
					upsertPageAnnotation(annotation as ThyroidAnnotation, page)
					syncDraftChanges(
						annotation.id,
						'update',
						getAnnotationPoints(annotation, page),
						getAnnotationProps(annotation)?.group ?? currentGroupRef.current,
					)
				} catch (error) {
					console.error('Error updating draft annotation:', error)
				}
			})

			instance.on('deleteAnnotation', (annotation: ImageAnnotation) => {
				try {
					if (isStructureAnnotationId(annotation.id)) return
					removePageAnnotation(annotation.id)
					syncDraftChanges(
						annotation.id,
						'delete',
						[],
						getAnnotationProps(annotation)?.group ?? currentGroupRef.current,
					)
				} catch (error) {
					console.error('Error deleting draft annotation:', error)
				}
			})
		},
		[style, syncDraftChanges, upsertPageAnnotation, removePageAnnotation, updateAnnotationsForPage],
	)

	const detach = useCallback(() => {
		const instance = annoRef.current
		annoRef.current = null
		unsubscribeSelectionRef.current?.()
		unsubscribeSelectionRef.current = null
		setAnnotator(null)
		setSelectedId(null)
		if (!instance) return

		try {
			instance.destroy()
		} catch (err) {
			console.warn('Error destroying annotations:', err)
		}
	}, [])

	const setTool = useCallback((tool: ViewerToolId, enabled: boolean) => {
		// Рисовать можно только инструментами самого Annotorious; на навигации,
		// кисти и линейке рисование выключается, иначе оно забирает перетаскивание.
		const drawing = enabled && isDrawingTool(tool)
		toolRef.current = { tool, drawing }
		applyTool(annoRef.current, tool, drawing)
	}, [])

	/**
	 * Кисть отдаёт растровую маску, а формат хранения у нас — полигон.
	 * Готовый контур оформляется в такую же аннотацию, как нарисованная, и
	 * проходит обычным путём черновиков.
	 */
	const addPolygon = useCallback(
		(points: PlanePoint[]) => {
			const anno = annoRef.current
			if (!anno || points.length < 3) return false

			const page = currentPageRef.current
			const group = currentGroupRef.current?.toString()
			const annotation = buildPolygonAnnotation(makeLocalId(), points, {
				kind: 'node',
				color: (group && groupColorRef.current.get(group)) || FALLBACK_NODE_COLOR,
				group,
			})

			try {
				anno.addAnnotation(annotation)
			} catch (error) {
				console.error('Не удалось добавить контур кисти:', error)
				return false
			}

			upsertPageAnnotation(annotation, page)
			syncDraftChanges(annotation.id, 'create', getAnnotationPoints(annotation, page), group)
			return true
		},
		[syncDraftChanges, upsertPageAnnotation],
	)

	const removeAnnotation = useCallback((id: string) => {
		if (isStructureAnnotationId(id) || readOnlyRef.current) return
		// Событие `deleteAnnotation` само уберёт контур из кадра и черновика.
		annoRef.current?.removeAnnotation(id)
	}, [])

	/**
	 * Досохранить правку выделенного контура: `updateAnnotation` Annotorious 3
	 * шлёт при снятии выделения, асинхронно (setTimeout). Ждём с запасом,
	 * чтобы черновик успел обновиться до отправки на бэкенд.
	 */
	const flushPendingSelection = useCallback(async () => {
		const anno = annoRef.current
		if (!anno || anno.getSelected().length === 0) return
		anno.cancelSelected()
		await new Promise(resolve => setTimeout(resolve, 30))
	}, [])

	const layer = useMemo<ViewerAnnotationLayer>(
		() => ({ attach, detach, setTool, addPolygon }),
		[attach, detach, setTool, addPolygon],
	)

	const selected = useMemo<ThyroidAnnotation | null>(
		() => (selectedId && annotator ? ((annotator.getAnnotationById(selectedId) as ThyroidAnnotation) ?? null) : null),
		[annotator, selectedId],
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

	return {
		layer,
		annotator,
		selected,
		removeAnnotation,
		uniqueNodes,
		structureItems,
		hasStructures,
		flushPendingSelection,
	}
}

/** Узел ещё не сохранённого контура — из черновика. */
function findDraftGroup(changes: SegmentDraftChange[], annotationId: string): string | number | undefined {
	return changes.find(change => change.annotationId === annotationId)?.segment_group
}
