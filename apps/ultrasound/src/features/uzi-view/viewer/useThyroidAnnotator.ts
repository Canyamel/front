import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Annotorious from '@recogito/annotorious-openseadragon'
import SelectorPack from '@recogito/annotorious-selector-pack'
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css'
import type { ViewerImage, ViewerInstance } from '@medml/viewers'
import type { Segment, SegmentDraftChange, SegmentPoint } from '../model/types'
import { demoThyroidStructures, type ThyroidStructureJson } from '../structures'
import { TI_RADS_OPTIONS } from './constants'
import {
	buildSegmentAnnotationsByPage,
	buildStructureAnnotationsForPage,
	buildUniqueNodes,
	getAnnotationGroup,
	getAnnotationPoints,
	type UniqueNode,
} from './thyroidAnnotations'

export interface UseThyroidAnnotatorOptions {
	/** Живой инстанс движка рендера из `@medml/viewers` (onInstanceReady). */
	osdViewer: ViewerInstance | null
	images: ViewerImage[]
	seg: Segment[]
	tool: string
	readOnly: boolean
	currentPage: number
	currentGroup?: string | number
	thyroidStructures?: ThyroidStructureJson
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
}

export interface UseThyroidAnnotatorResult {
	showSegments: boolean
	toggleSegments: () => void
	uniqueNodes: UniqueNode[]
	flushPendingSelection: () => Promise<void>
}

/**
 * Весь жизненный цикл Annotorious для результатов УЗИ ЩЖ в одном месте:
 * подключение к живому инстансу OpenSeadragon (переданному из
 * `@medml/viewers` через `onInstanceReady`), построение аннотаций из
 * доменных данных (узлы + контуры структур, через `thyroidAnnotations.ts`)
 * и обработка create/update/delete в черновики изменений.
 *
 * Это "OpenSeadragon-glue" слой — знает про Annotorious и про доменные
 * данные УЗИ, но ничего не рендерит сам и не знает про чистое управление
 * OSD (zoom/pan/rotate), которое остаётся в `@medml/viewers`.
 */
export function useThyroidAnnotator({
	osdViewer,
	images,
	seg,
	tool,
	readOnly,
	currentPage,
	currentGroup,
	thyroidStructures,
	onDraftChangesChange,
}: UseThyroidAnnotatorOptions): UseThyroidAnnotatorResult {
	const annoRef = useRef<any>(null)
	const currentGroupRef = useRef<string | number | undefined>(currentGroup)
	const showSegmentsRef = useRef(true)
	const pageAnnotationsRef = useRef<Record<number, any[]>>({})
	const pageStructureAnnotationsRef = useRef<Record<number, any[]>>({})
	const draftChangesRef = useRef<SegmentDraftChange[]>([])

	const [showSegments, setShowSegments] = useState(true)
	const [pageAnnotations, setPageAnnotations] = useState<Record<number, any[]>>({})

	useEffect(() => {
		currentGroupRef.current = currentGroup
	}, [currentGroup])

	useEffect(() => {
		showSegmentsRef.current = showSegments
	}, [showSegments])

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

	const upsertPageAnnotation = useCallback(
		(annotation: any, pageIndex: number) => {
			setPageAnnotations(prev => {
				const next: Record<number, any[]> = {}
				Object.entries(prev).forEach(([key, value]) => {
					next[Number(key)] = (value || []).filter(
						item => String(item.id) !== String(annotation.id),
					)
				})
				next[pageIndex] = [...(next[pageIndex] || []), annotation]
				pageAnnotationsRef.current = next
				return next
			})
		},
		[],
	)

	const removePageAnnotation = useCallback((annotationId: string) => {
		setPageAnnotations(prev => {
			const next: Record<number, any[]> = {}
			Object.entries(prev).forEach(([key, value]) => {
				next[Number(key)] = (value || []).filter(
					annotation => String(annotation.id) !== annotationId,
				)
			})
			pageAnnotationsRef.current = next
			return next
		})
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

				next = [
					...next,
					{ annotationId, type: 'delete', segment_group: segmentGroup },
				]
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

	const updateAnnotationsForPage = useCallback(
		(
			pageIndex: number,
			annotationsMap: Record<number, any[]> = pageAnnotationsRef.current,
		) => {
			if (!annoRef.current) return

			try {
				annoRef.current.clearAnnotations()

				const annotationsForPage = [
					...(pageStructureAnnotationsRef.current[pageIndex] || []),
					...(showSegmentsRef.current ? annotationsMap[pageIndex] || [] : []),
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
		},
		[],
	)

	// Контуры структур ЩЖ для текущей страницы — построение вынесено в
	// чистую функцию buildStructureAnnotationsForPage.
	useEffect(() => {
		const source = images[currentPage]?.url || ''
		// Если к снимку не приложен JSON структур — показываем демонстрационные
		// контуры (поведение исходного вьюера).
		const structures = thyroidStructures ?? demoThyroidStructures
		pageStructureAnnotationsRef.current = {
			...pageStructureAnnotationsRef.current,
			[currentPage]: buildStructureAnnotationsForPage(
				structures,
				currentPage,
				source,
			),
		}
		updateAnnotationsForPage(currentPage, pageAnnotationsRef.current)
	}, [currentPage, images, thyroidStructures, updateAnnotationsForPage])

	// Аннотации узлов (segments) — построение вынесено в buildSegmentAnnotationsByPage.
	useEffect(() => {
		const pageAnnotationsMap = buildSegmentAnnotationsByPage(seg, images)
		pageAnnotationsRef.current = pageAnnotationsMap
		setPageAnnotations(pageAnnotationsMap)
		updateAnnotationsForPage(currentPage, pageAnnotationsMap)
	}, [seg, images, currentPage, updateAnnotationsForPage])

	// Перерисовка при переключении видимости/странице.
	useEffect(() => {
		if (!annoRef.current) return
		updateAnnotationsForPage(currentPage, pageAnnotations)
	}, [showSegments, currentPage, pageAnnotations, updateAnnotationsForPage])

	// Подключение Annotorious к живому инстансу OpenSeadragon. Инстанс
	// принадлежит @medml/viewers — сюда он попадает через onInstanceReady.
	useEffect(() => {
		if (!osdViewer) return

		const annotateState = Annotorious(osdViewer, {
			readOnly,
			widgets: [
				'COMMENT',
				{
					widget: 'TAG',
					vocabulary: TI_RADS_OPTIONS,
				},
			],
			tools: ['ellipse', 'freehand', 'point'],
			// Цвет контура/заливки из body с purpose 'color' — через встроенный
			// formatter Annotorious, без ручного querySelector + setTimeout
			// (в прежней версии это была гонка с перерисовкой аннотаций).
			formatter: (annotation: any) => {
				const colorBody = annotation.body?.find((b: any) => b.purpose === 'color')
				const nodeColor = colorBody?.value || '#FF0000'
				return { style: `stroke:${nodeColor}; fill:${nodeColor};` }
			},
		})

		annotateState.setDrawingTool(tool === 'rect' ? 'rect' : 'polygon')
		SelectorPack(annotateState)
		annoRef.current = annotateState

		window.setTimeout(() => {
			updateAnnotationsForPage(currentPage, pageAnnotationsRef.current)
		}, 0)

		if (!readOnly) {
			annotateState.on('createAnnotation', (annotation: any, overrideId: any) => {
				try {
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
					upsertPageAnnotation(localAnnotation, currentPage)
					syncDraftChanges(
						localId,
						'create',
						getAnnotationPoints(localAnnotation, currentPage),
						getAnnotationGroup(localAnnotation, currentGroupRef.current),
					)
				} catch (error) {
					console.error('Error creating draft annotation:', error)
				}
			})

			annotateState.on('updateAnnotation', (annotation: any) => {
				try {
					upsertPageAnnotation(annotation, currentPage)
					syncDraftChanges(
						String(annotation.id),
						'update',
						getAnnotationPoints(annotation, currentPage),
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
		}

		return () => {
			try {
				annotateState.destroy()
			} catch (err) {
				console.warn('Error destroying annotations:', err)
			}
			if (annoRef.current === annotateState) {
				annoRef.current = null
			}
		}
	}, [
		osdViewer,
		readOnly,
		currentPage,
		tool,
		syncDraftChanges,
		upsertPageAnnotation,
		removePageAnnotation,
		updateAnnotationsForPage,
	])

	useEffect(() => {
		annoRef.current?.setDrawingTool(tool === 'rect' ? 'rect' : 'polygon')
	}, [tool])

	const toggleSegments = useCallback(() => setShowSegments(prev => !prev), [])

	const uniqueNodes = useMemo(() => buildUniqueNodes(seg), [seg])

	const flushPendingSelection = useCallback(async () => {
		if (annoRef.current?.saveSelected) {
			await annoRef.current.saveSelected()
		}
	}, [])

	return { showSegments, toggleSegments, uniqueNodes, flushPendingSelection }
}
