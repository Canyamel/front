import { useCallback, useEffect, useMemo, useRef } from 'react'
import Annotorious from '@recogito/annotorious-openseadragon'
import SelectorPack from '@recogito/annotorious-selector-pack'
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css'
import type {
	PlanePoint,
	ViewerAnnotationLayer,
	ViewerImage,
	ViewerInstance,
	ViewerToolId,
} from '@medml/viewers'
import { isDrawingTool } from '@medml/viewers'
import type { Segment, SegmentDraftChange, SegmentPoint } from '../model/types'
import type { ThyroidStructureJson } from '../structures'
import { ANNOTORIOUS_TOOL_NAMES, TI_RADS_OPTIONS } from './constants'
import {
	buildSegmentAnnotationsByPage,
	buildStructureAnnotationsForPage,
	buildUniqueNodes,
	getAnnotationGroup,
	getAnnotationPoints,
	type UniqueNode,
} from './thyroidAnnotations'

/**
 * Переключает инструмент рисования.
 *
 * Обёрнуто в try/catch намеренно: `setDrawingTool` внутри Annotorious ищет
 * инструмент по identifier и сразу вызывает `new Tool(...)`. Неизвестный id
 * там превращается в `new undefined()`, и падение уносило бы за собой весь
 * вьюер. Лучше остаться на предыдущем инструменте и написать в консоль.
 */
function applyViewerTool(anno: any, tool: ViewerToolId, drawing: boolean): void {
	if (!anno) return

	try {
		if (drawing) {
			// Общие id вьюера переводим в имена инструментов Annotorious 2:
			// прямоугольник у него называется `rect`, остальное совпадает.
			anno.setDrawingTool(ANNOTORIOUS_TOOL_NAMES[tool] ?? tool)
		}
		// Плагин по умолчанию ждёт зажатый Shift; включаем рисование явно,
		// иначе выбранный инструмент visually активен, но не работает.
		anno.setDrawingEnabled(drawing)
	} catch (error) {
		console.error(`Не удалось включить инструмент «${tool}»:`, error)
	}
}

export interface UseThyroidAnnotatorOptions {
	images: ViewerImage[]
	seg: Segment[]
	readOnly: boolean
	/** Текущий кадр — аннотации привязаны к странице снимка. */
	currentPage: number
	/** Показывать ли контуры узлов (контуры структур ЩЖ видны всегда). */
	annotationsVisible: boolean
	currentGroup?: string | number
	thyroidStructures?: ThyroidStructureJson
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
}

export interface UseThyroidAnnotatorResult {
	/** Слой разметки для `<AnnotatedStudyViewer annotationLayer={...} />`. */
	layer: ViewerAnnotationLayer
	uniqueNodes: UniqueNode[]
	flushPendingSelection: () => Promise<void>
}

/**
 * Весь жизненный цикл Annotorious для результатов УЗИ ЩЖ в одном месте:
 * подключение к живому инстансу OpenSeadragon, построение аннотаций из
 * доменных данных (узлы + контуры структур, через `thyroidAnnotations.ts`)
 * и обработка create/update/delete в черновики изменений.
 *
 * Наружу хук отдаёт `layer` — реализацию общего контракта
 * `ViewerAnnotationLayer` из `@medml/viewers`. Вьюер вызывает у него
 * `attach`/`detach`/`setTool`/`addPolygon` и больше ничего про Annotorious 2
 * не знает: в цитологии на его месте стоит такой же адаптер, только над
 * Annotorious 3.
 */
export function useThyroidAnnotator({
	images,
	seg,
	readOnly,
	currentPage,
	annotationsVisible,
	currentGroup,
	thyroidStructures,
	onDraftChangesChange,
}: UseThyroidAnnotatorOptions): UseThyroidAnnotatorResult {
	const annoRef = useRef<any>(null)
	// Обработчики Annotorious вешаются один раз на инстанс, поэтому кадр,
	// видимость разметки и активный инструмент читаются через ref — иначе в
	// замыкании осталось бы значение с момента подписки.
	//
	// Значения инициализируются сразу и подтягиваются эффектом: инстанс
	// Annotorious создаётся уже после первого рендера, поэтому к моменту
	// подключения и первого события в ref'ах лежит актуальное значение.
	const currentGroupRef = useRef(currentGroup)
	const currentPageRef = useRef(currentPage)
	const readOnlyRef = useRef(readOnly)
	const annotationsVisibleRef = useRef(annotationsVisible)
	const toolRef = useRef<{ tool: ViewerToolId; drawing: boolean }>({
		tool: 'pan',
		drawing: false,
	})
	const pageAnnotationsRef = useRef<Record<number, any[]>>({})
	const pageStructureAnnotationsRef = useRef<Record<number, any[]>>({})
	const draftChangesRef = useRef<SegmentDraftChange[]>([])

	useEffect(() => {
		currentGroupRef.current = currentGroup
		currentPageRef.current = currentPage
		readOnlyRef.current = readOnly
		annotationsVisibleRef.current = annotationsVisible
	}, [currentGroup, currentPage, readOnly, annotationsVisible])

	// Глобальные стили аннотаций — не зависят от жизненного цикла инстанса OSD.
	useEffect(() => {
		const style = document.createElement('style')
		style.textContent = `
      .a9s-annotation .a9s-inner {
        stroke-width: 2px;
        stroke-opacity: 0.8;
        fill-opacity: 0.3;
      }
    `
		document.head.appendChild(style)
		return () => {
			if (document.head.contains(style)) {
				document.head.removeChild(style)
			}
		}
	}, [])

	const updateAnnotationsForPage = useCallback((pageIndex: number) => {
		if (!annoRef.current) return

		try {
			annoRef.current.clearAnnotations()

			const annotationsForPage = [
				...(pageStructureAnnotationsRef.current[pageIndex] || []),
				...(annotationsVisibleRef.current ? pageAnnotationsRef.current[pageIndex] || [] : []),
			]

			annotationsForPage.forEach((annotation: any) => {
				try {
					annoRef.current.addAnnotation(annotation)
				} catch (error) {
					console.error('Error adding annotation:', error)
				}
			})
		} catch (err) {
			console.error('Error updating annotations:', err)
		}
	}, [])

	const upsertPageAnnotation = useCallback(
		(annotation: any, pageIndex: number) => {
			const next: Record<number, any[]> = {}
			Object.entries(pageAnnotationsRef.current).forEach(([key, value]) => {
				next[Number(key)] = (value || []).filter(
					item => String(item.id) !== String(annotation.id),
				)
			})
			next[pageIndex] = [...(next[pageIndex] || []), annotation]
			pageAnnotationsRef.current = next
		},
		[],
	)

	const removePageAnnotation = useCallback((annotationId: string) => {
		const next: Record<number, any[]> = {}
		Object.entries(pageAnnotationsRef.current).forEach(([key, value]) => {
			next[Number(key)] = (value || []).filter(
				annotation => String(annotation.id) !== annotationId,
			)
		})
		pageAnnotationsRef.current = next
	}, [])

	const syncDraftChanges = useCallback(
		(
			annotationId: string,
			type: SegmentDraftChange['type'],
			points: SegmentPoint[] = [],
			segmentGroup?: string | number,
		) => {
			const prev = draftChangesRef.current
			const existing = prev.find(change => change.annotationId === annotationId)
			let next = prev.filter(change => change.annotationId !== annotationId)

			if (type === 'delete') {
				if (existing?.type === 'create') {
					draftChangesRef.current = next
					onDraftChangesChange?.(next)
					return
				}

				next = [...next, { annotationId, type: 'delete', segment_group: segmentGroup }]
				draftChangesRef.current = next
				onDraftChangesChange?.(next)
				return
			}

			const nextChange: SegmentDraftChange = {
				annotationId,
				type: existing?.type === 'create' ? 'create' : type,
				points,
				segment_group: segmentGroup,
			}

			next = [...next, nextChange]
			draftChangesRef.current = next
			onDraftChangesChange?.(next)
		},
		[onDraftChangesChange],
	)

	// Контуры структур ЩЖ для текущей страницы — построение вынесено в
	// чистую функцию buildStructureAnnotationsForPage.
	useEffect(() => {
		const source = images[currentPage]?.url || ''
		pageStructureAnnotationsRef.current = {
			...pageStructureAnnotationsRef.current,
			[currentPage]: buildStructureAnnotationsForPage(thyroidStructures, currentPage, source),
		}
		updateAnnotationsForPage(currentPage)
	}, [currentPage, images, thyroidStructures, updateAnnotationsForPage])

	// Аннотации узлов (segments) — построение вынесено в buildSegmentAnnotationsByPage.
	useEffect(() => {
		pageAnnotationsRef.current = buildSegmentAnnotationsByPage(seg, images)
		updateAnnotationsForPage(currentPage)
	}, [seg, images, currentPage, updateAnnotationsForPage])

	// Перерисовка при переключении видимости разметки.
	useEffect(() => {
		updateAnnotationsForPage(currentPage)
	}, [annotationsVisible, currentPage, updateAnnotationsForPage])

	/**
	 * Подключение Annotorious к живому инстансу OpenSeadragon.
	 *
	 * Инстанс принадлежит `@medml/viewers`; сюда он попадает через контракт
	 * слоя разметки, то есть в момент, когда вьюер открыл снимок.
	 *
	 * ВАЖНО: `readOnly` Annotorious принимает только при создании, а создаётся
	 * он один раз на инстанс OSD. Переключение режима работает потому, что
	 * `Gallery` монтирует вьюер заново (`key` включает `isEditMode`). Если этот
	 * `key` убрать, вход в редактирование оставит слой в режиме просмотра —
	 * тогда здесь понадобится пересоздание инстанса на смену `readOnly`.
	 */
	const attach = useCallback(
		(viewer: ViewerInstance) => {
			const isReadOnly = readOnlyRef.current

			const annotateState = Annotorious(viewer, {
				readOnly: isReadOnly,
				widgets: [
					'COMMENT',
					{
						widget: 'TAG',
						vocabulary: TI_RADS_OPTIONS,
					},
				],
				// Цвет контура/заливки из body с purpose 'color' — через встроенный
				// formatter Annotorious, без ручного querySelector + setTimeout
				// (в прежней версии это была гонка с перерисовкой аннотаций).
				formatter: (annotation: any) => {
					const colorBody = annotation.body?.find((b: any) => b.purpose === 'color')
					const nodeColor = colorBody?.value || '#FF0000'
					return { style: `stroke:${nodeColor}; fill:${nodeColor};` }
				},
			})

			// Порядок важен: SelectorPack регистрирует инструменты, а
			// `setDrawingTool` ищет их по identifier и сразу инстанцирует
			// (`new Tool(...)`). Если инструмент ещё не зарегистрирован, внутри
			// Annotorious получается `new undefined()` — исключение обрывало
			// инициализацию, и вьюер переставал реагировать вовсе.
			//
			// Список передаётся вторым аргументом: ключ `tools` в конфиге самого
			// Annotorious selector-pack не читает.
			SelectorPack(annotateState, { tools: ['ellipse', 'point', 'freehand', 'line'] })

			annoRef.current = annotateState
			applyViewerTool(annotateState, toolRef.current.tool, toolRef.current.drawing)

			window.setTimeout(() => {
				updateAnnotationsForPage(currentPageRef.current)
			}, 0)

			if (isReadOnly) return

			annotateState.on('createAnnotation', (annotation: any, overrideId: any) => {
				try {
					const page = currentPageRef.current
					const localId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
					const selectedGroup = currentGroupRef.current?.toString()

					if (selectedGroup && Array.isArray(annotation.body)) {
						annotation.body = [
							...annotation.body.filter(
								(item: any) => !['group', 'node-id'].includes(item.purpose),
							),
							{
								type: 'TextualBody',
								value: selectedGroup,
								purpose: 'group',
							},
							{
								type: 'TextualBody',
								value: selectedGroup,
								purpose: 'node-id',
							},
						]
					}

					overrideId(localId)
					const localAnnotation = { ...annotation, id: localId }
					upsertPageAnnotation(localAnnotation, page)
					syncDraftChanges(
						localId,
						'create',
						getAnnotationPoints(localAnnotation, page),
						getAnnotationGroup(localAnnotation, currentGroupRef.current),
					)
				} catch (error) {
					console.error('Error creating draft annotation:', error)
				}
			})

			annotateState.on('updateAnnotation', (annotation: any) => {
				try {
					const page = currentPageRef.current
					upsertPageAnnotation(annotation, page)
					syncDraftChanges(
						String(annotation.id),
						'update',
						getAnnotationPoints(annotation, page),
						getAnnotationGroup(annotation, currentGroupRef.current),
					)
				} catch (error) {
					console.error('Error updating draft annotation:', error)
				}
			})

			annotateState.on('deleteAnnotation', (annotation: any) => {
				try {
					removePageAnnotation(String(annotation.id))
					syncDraftChanges(
						String(annotation.id),
						'delete',
						[],
						getAnnotationGroup(annotation, currentGroupRef.current),
					)
				} catch (error) {
					console.error('Error deleting draft annotation:', error)
				}
			})
		},
		[syncDraftChanges, upsertPageAnnotation, removePageAnnotation, updateAnnotationsForPage],
	)

	const detach = useCallback(() => {
		const instance = annoRef.current
		annoRef.current = null
		if (!instance) return

		try {
			instance.destroy()
		} catch (err) {
			console.warn('Error destroying annotations:', err)
		}
	}, [])

	const setTool = useCallback((tool: ViewerToolId, enabled: boolean) => {
		// Рисовать можно только инструментами самого Annotorious; на навигации,
		// кисти и линейке трекер выключается, иначе он забирает перетаскивание.
		const drawing = enabled && isDrawingTool(tool)
		toolRef.current = { tool, drawing }
		applyViewerTool(annoRef.current, tool, drawing)
	}, [])

	/**
	 * Кисть отдаёт растровую маску, а формат хранения у нас — полигон.
	 * Здесь готовый контур оформляется в такую же аннотацию, какую создал бы
	 * Annotorious, и проходит обычным путём черновиков — форматы совпадают.
	 */
	const addPolygon = useCallback(
		(points: PlanePoint[]) => {
			if (!annoRef.current || points.length < 3) return false

			const page = currentPageRef.current
			const selectedGroup = currentGroupRef.current?.toString()
			const localId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
			const svgPoints = points.map(p => `${p.x},${p.y}`).join(' ')

			const annotation = {
				type: 'Annotation',
				'@context': 'http://www.w3.org/ns/anno.jsonld',
				id: localId,
				body: selectedGroup
					? [
							{ type: 'TextualBody', value: selectedGroup, purpose: 'group' },
							{ type: 'TextualBody', value: selectedGroup, purpose: 'node-id' },
						]
					: [],
				target: {
					selector: {
						type: 'SvgSelector',
						value: `<svg><polygon points="${svgPoints}"></polygon></svg>`,
					},
				},
			}

			try {
				annoRef.current.addAnnotation(annotation)
			} catch (error) {
				console.error('Не удалось добавить контур кисти:', error)
				return false
			}

			upsertPageAnnotation(annotation, page)
			syncDraftChanges(localId, 'create', getAnnotationPoints(annotation, page), selectedGroup)
			return true
		},
		[syncDraftChanges, upsertPageAnnotation],
	)

	const flushPendingSelection = useCallback(async () => {
		if (annoRef.current?.saveSelected) {
			await annoRef.current.saveSelected()
		}
	}, [])

	const layer = useMemo<ViewerAnnotationLayer>(
		() => ({ attach, detach, setTool, addPolygon }),
		[attach, detach, setTool, addPolygon],
	)

	const uniqueNodes = useMemo(() => buildUniqueNodes(seg), [seg])

	return { layer, uniqueNodes, flushPendingSelection }
}
