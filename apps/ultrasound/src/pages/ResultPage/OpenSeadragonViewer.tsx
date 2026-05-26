import { useEffect, useRef, useState, useCallback } from 'react'
import OpenSeaDragon from 'openseadragon'
import Annotorious from '@recogito/annotorious-openseadragon'
import SelectorPack from '@recogito/annotorious-selector-pack'
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css'
import { fromGeoJSON, toGeoJSON } from 'svg-polygon-points'
import type { SegmentDraftChange, SegmentPoint } from '@/lib/thyroidResultsTypes'
import { NODE_COLORS, TI_RADS_OPTIONS } from './ViewerConstants'
import type { OpenSeadragonViewerProps } from '@/lib/viewerTypes'

const OSD_PREFIX_URL =
  'https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/images/'

const OpenSeadragonViewer = ({
	image,
	tool,
	url,
	seg,
	imageid,
	readOnly = true,
	height = 600,
	currentGroup,
	onDraftChangesChange,
	onViewerApiReady,
}: OpenSeadragonViewerProps) => {
	const viewerRef = useRef<any>(null)
	const annoRef = useRef<any>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const currentGroupRef = useRef<string | number | undefined>(currentGroup)
	const showSegmentsRef = useRef(true)
	const viewerReadyRef = useRef(false)
	const pageAnnotationsRef = useRef<Record<number, any[]>>({})
	const draftChangesRef = useRef<SegmentDraftChange[]>([])

	const formatProbability = useCallback((value?: number) => {
		return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '—'
	}, [])

	const getProbabilityValue = useCallback((segment: any, keys: string[]) => {
		const details = (segment?.details || {}) as Record<
			string,
			number | undefined
		>
		for (const key of keys) {
			const value = details[key]
			if (typeof value === 'number') {
				return value
			}
		}
		return undefined
	}, [])

	const [zoomLevel, setZoomLevel] = useState(1)
	const [showSegments, setShowSegments] = useState(true)
	const [currentPage, setCurrentPage] = useState(0)
	const [totalPages, setTotalPages] = useState(0)
	const [isLoadingPage, setIsLoadingPage] = useState(false)
	const [pageAnnotations, setPageAnnotations] = useState<Record<number, any[]>>(
		{},
	)

	useEffect(() => {
		currentGroupRef.current = currentGroup
	}, [currentGroup])

	useEffect(() => {
		showSegmentsRef.current = showSegments
	}, [showSegments])

	const getAnnotationGroup = useCallback((annotation: any) => {
		const groupBody = annotation?.body?.find(
			(item: any) => item.purpose === 'group',
		)
		return groupBody?.value ?? currentGroupRef.current
	}, [])

	const getAnnotationPoints = useCallback(
		(annotation: any, pageIndex: number): SegmentPoint[] => {
			const selectorValue = annotation?.target?.selector?.value || ''

			if (selectorValue.includes('<polygon')) {
				const svgValue = selectorValue.split('"')[1]
				const coords = toGeoJSON(svgValue)
				if (coords[0]) {
					return coords[0].map((point: any) => ({
						x: parseInt(point[0]),
						y: parseInt(point[1]),
						z: pageIndex,
					}))
				}
			}

			if (selectorValue.includes('xywh=')) {
				const rectValues = selectorValue.split(':')[1].split(',')
				const [x, y, width, height] = rectValues.map((value: string) =>
					parseInt(value),
				)

				return [
					{ x, y, z: pageIndex },
					{ x: x + width, y, z: pageIndex },
					{ x: x + width, y: y + height, z: pageIndex },
					{ x, y: y + height, z: pageIndex },
				]
			}

			return []
		},
		[],
	)

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

	// Получаем уникальные узлы для легенды
	const getUniqueNodes = useCallback(() => {
		if (!seg || !Array.isArray(seg)) return []

		const nodes = seg.map((segment, index) => ({
			id: segment.id,
			displayIndex: index + 1,
			color: NODE_COLORS[index % NODE_COLORS.length],
			type: segment.details?.nodule_type || 'Unknown',
		}))

		return nodes
	}, [seg])

	// Функция для обновления аннотаций на текущей странице
	const updateAnnotationsForPage = useCallback(
		(
			pageIndex: number,
			annotationsMap: Record<number, any[]> = pageAnnotationsRef.current,
		) => {
			if (!annoRef.current) return

			try {
				annoRef.current.clearAnnotations()

				const annotationsForPage = annotationsMap[pageIndex] || []

				if (showSegmentsRef.current && annotationsForPage.length > 0) {
					annotationsForPage.forEach((annotation: any) => {
						try {
							annoRef.current.addAnnotation(annotation)

							setTimeout(() => {
								const colorBody = annotation.body.find(
									(b: any) => b.purpose === 'color',
								)
								const nodeColor = colorBody?.value || '#FF0000'

								const element = document.querySelector(
									`[data-id="${annotation.id}"]`,
								)
								if (element) {
									const inner = element.querySelector(
										'.a9s-inner',
									) as HTMLElement
									if (inner) {
										inner.style.stroke = nodeColor
										inner.style.fill = nodeColor
									}
								}
							}, 50)
						} catch (error) {
							console.error('Error adding annotation:', error)
						}
					})
				}
			} catch (err) {
				console.error('Error updating annotations:', err)
			}
		},
		[],
	)

	// Инициализация OpenSeadragon
	useEffect(() => {
		if (!containerRef.current || !image) return

		if (viewerRef.current) {
			try {
				viewerRef.current.destroy()
			} catch (err) {
				console.warn('Error destroying viewer:', err)
			}
		}

		try {
			const viewer = OpenSeaDragon({
				element: containerRef.current,
				prefixUrl: OSD_PREFIX_URL,
				tileSources: image as OpenSeaDragon.TileSourceOptions,
				sequenceMode: Array.isArray(image),
				showNavigator: false,
				showFullPageControl: false,
				showHomeControl: false,
				showZoomControl: false,
				nextButton: 'none', // Явно отключает кнопку "вперед"
				previousButton: 'none', // Явно отключает кнопку "назад"
				animationTime: 0.2,
				blendTime: 0.1,
				constrainDuringPan: false,
				visibilityRatio: 0.1,
				minZoomImageRatio: 0.5,
				maxZoomPixelRatio: 12,
				maxZoomLevel: 10,
				zoomPerClick: 1.6,
				zoomPerScroll: 1.2,
				gestureSettingsMouse: {
					scrollToZoom: true,
					clickToZoom: false,
					dblClickToZoom: true,
					dragToPan: true,
				},
			})

			viewerRef.current = viewer

			if (Array.isArray(image)) {
				setTotalPages(image.length)
			}

			viewer.addHandler('open', () => {
				viewerReadyRef.current = true
				const openedPage = viewer.currentPage?.() ?? 0
				setCurrentPage(openedPage)
				setZoomLevel(1)

				window.setTimeout(() => {
					updateAnnotationsForPage(openedPage, pageAnnotationsRef.current)
				}, 0)
			})

			viewer.addHandler('zoom', (event: any) => {
				const homeZoom = viewer.viewport?.getHomeZoom() || 1
				setZoomLevel(event.zoom / homeZoom)
			})

			viewer.addHandler('page', (data: any) => {
				setCurrentPage(data.page)
				updateAnnotationsForPage(data.page)
			})

			const annotateState = Annotorious(viewer, {
				readOnly: readOnly,
				widgets: [
					'COMMENT',
					{
						widget: 'TAG',
						vocabulary: TI_RADS_OPTIONS,
					},
				],
				tools: ['ellipse', 'freehand', 'point'],
			})

			annotateState.setDrawingTool('polygon')
			SelectorPack(annotateState)
			annoRef.current = annotateState
			onViewerApiReady?.({
				flushPendingSelection: async () => {
					if (annoRef.current?.saveSelected) {
						await annoRef.current.saveSelected()
					}
				},
			})

			window.setTimeout(() => {
				updateAnnotationsForPage(
					viewer.currentPage?.() ?? 0,
					pageAnnotationsRef.current,
				)
			}, 0)

			const style = document.createElement('style')
			style.textContent = `
        .a9s-annotation .a9s-inner {
          stroke-width: 2px;
          stroke-opacity: 0.8;
          fill-opacity: 0.3;
        }
      `
			document.head.appendChild(style)

			if (!readOnly) {
				annotateState.on(
					'createAnnotation',
					(annotation: any, overrideId: any) => {
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
								getAnnotationGroup(localAnnotation),
							)
						} catch (error) {
							console.error('Error creating draft annotation:', error)
						}
					},
				)

				annotateState.on('updateAnnotation', (annotation: any) => {
					try {
						upsertPageAnnotation(annotation, currentPage)
						syncDraftChanges(
							String(annotation.id),
							'update',
							getAnnotationPoints(annotation, currentPage),
							getAnnotationGroup(annotation),
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
							getAnnotationGroup(annotation),
						)
					} catch (error) {
						console.error('Error deleting draft annotation:', error)
					}
				})
			}

			return () => {
				viewerReadyRef.current = false
				if (annoRef.current) {
					try {
						annoRef.current.destroy()
					} catch (err) {
						console.warn('Error destroying annotations:', err)
					}
				}
				if (viewerRef.current) {
					try {
						viewerRef.current.destroy()
					} catch (err) {
						console.warn('Error destroying viewer:', err)
					}
				}
				if (document.head.contains(style)) {
					document.head.removeChild(style)
				}
			}
		} catch (error) {
			console.error('Error initializing OpenSeadragon:', error)
		}
	}, [
		image,
		readOnly,
		getAnnotationGroup,
		getAnnotationPoints,
		syncDraftChanges,
		upsertPageAnnotation,
		removePageAnnotation,
		onViewerApiReady,
		updateAnnotationsForPage,
	])

	useEffect(() => {
		if (annoRef.current) {
			annoRef.current.setDrawingTool(tool === 'rect' ? 'rect' : 'polygon')
		}
	}, [tool])

	// Подготовка аннотаций по страницам
	useEffect(() => {
		if (!seg || !Array.isArray(seg) || seg.length === 0) {
			pageAnnotationsRef.current = {}
			setPageAnnotations({})
			updateAnnotationsForPage(currentPage, {})
			return
		}

		const pageAnnotationsMap: any = {}

		const actualPages = Array.isArray(image) ? image.length : 1
		for (let i = 0; i < actualPages; i++) {
			pageAnnotationsMap[i] = []
		}

		seg.forEach((segment, segmentIndex) => {
			if (!segment.data) return

			const nodeColor = NODE_COLORS[segmentIndex % NODE_COLORS.length]
			const displayIndex = segmentIndex + 1
			const tirads2 = formatProbability(
				getProbabilityValue(segment, ['nodule_2', 'tirads_2']),
			)
			const tirads3 = formatProbability(
				getProbabilityValue(segment, ['nodule_3', 'tirads_3']),
			)
			const tirads4 = formatProbability(segment.details?.nodule_4)
			const tirads5 = formatProbability(segment.details?.nodule_5)

			segment.data.forEach((contour: any, contourIndex: number) => {
				if (!contour.points) return

				const pointsByPage: any = {}
				contour.points.forEach((point: any) => {
					const pageIndex = point.z || 0
					if (pageIndex >= 0 && pageIndex < actualPages) {
						if (!pointsByPage[pageIndex]) {
							pointsByPage[pageIndex] = []
						}
						pointsByPage[pageIndex].push(point)
					}
				})

				Object.entries(pointsByPage).forEach(([pageIndexStr, points]: any) => {
					if (points.length < 3) return

					try {
						const coord = points.map((point: any) => [point.x, point.y])
						const svgPoints = fromGeoJSON(coord).toString()
						const svgSelector = `<svg><polygon points="${svgPoints}"></polygon></svg>`

						const annotation = {
							type: 'Annotation',
							body: [
								{
									type: 'TextualBody',
									value: `Узел ${displayIndex}\nTI-RADS 2: ${tirads2}\nTI-RADS 3: ${tirads3}\nTI-RADS 4: ${tirads4}\nTI-RADS 5: ${tirads5}`,
									purpose: 'commenting',
								},
								{
									type: 'TextualBody',
									value: segment.is_ai ? 'AI only' : 'Updated',
									purpose: 'commenting',
								},
								{
									type: 'TextualBody',
									value:
										'TI-RADS ' + (segment.details?.nodule_type || 'Unknown'),
									purpose: 'tagging',
								},
								{
									type: 'TextualBody',
									value: segment.id.toString(),
									purpose: 'group',
								},
								{
									type: 'TextualBody',
									value: segment.is_ai ? 'AI' : 'Doctor result',
									purpose: 'tagging',
								},
								{
									type: 'TextualBody',
									value: nodeColor,
									purpose: 'color',
								},
								{
									type: 'TextualBody',
									value: segment.id.toString(),
									purpose: 'node-id',
								},
							],
							target: {
								source: Array.isArray(image)
									? image[parseInt(pageIndexStr)]?.url || ''
									: typeof image === 'object' && 'url' in image
										? image.url
										: '',
								selector: {
									type: 'SvgSelector',
									value: svgSelector,
								},
							},
							'@context': 'http://www.w3.org/ns/anno.jsonld',
							id: contour.id
								? contour.id.toString()
								: `node_${segment.id}_contour_${contourIndex}_page_${pageIndexStr}`,
						}

						pageAnnotationsMap[parseInt(pageIndexStr)].push(annotation)
					} catch (error) {
						console.error('Error creating annotation:', error)
					}
				})
			})
		})

		pageAnnotationsRef.current = pageAnnotationsMap
		setPageAnnotations(pageAnnotationsMap)
		updateAnnotationsForPage(currentPage, pageAnnotationsMap)
	}, [seg, image, updateAnnotationsForPage])

	// Обновляем аннотации при изменении видимости сегментов или группы
	useEffect(() => {
		if (!viewerReadyRef.current) return
		updateAnnotationsForPage(currentPage, pageAnnotations)
	}, [showSegments, currentPage, pageAnnotations, updateAnnotationsForPage])

	// Функции управления
	const goToPage = useCallback(
		(targetPage: number) => {
			if (!viewerRef.current || isLoadingPage) return

			const actualTargetPage = (targetPage + totalPages) % totalPages

			setIsLoadingPage(true)
			viewerRef.current.goToPage(actualTargetPage)

			setTimeout(() => {
				setIsLoadingPage(false)
			}, 300)
		},
		[totalPages, isLoadingPage],
	)

	const nextPage = useCallback(() => {
		if (isLoadingPage) return
		goToPage(currentPage + 1)
	}, [currentPage, isLoadingPage, goToPage])

	const prevPage = useCallback(() => {
		if (isLoadingPage) return
		goToPage(currentPage - 1)
	}, [currentPage, isLoadingPage, goToPage])

	const zoomIn = () => {
		if (viewerRef.current?.viewport) {
			const center = viewerRef.current.viewport.getCenter()
			viewerRef.current.viewport.zoomBy(1.4, center)
			viewerRef.current.viewport.applyConstraints()
		}
	}

	const zoomOut = () => {
		if (viewerRef.current?.viewport) {
			const center = viewerRef.current.viewport.getCenter()
			viewerRef.current.viewport.zoomBy(0.75, center)
			viewerRef.current.viewport.applyConstraints()
		}
	}

	const fitToScreen = () => {
		if (viewerRef.current?.viewport) {
			viewerRef.current.viewport.fitBounds(
				viewerRef.current.viewport.getHomeBounds(),
			)
		}
	}

	const rotateLeft = () => {
		if (viewerRef.current?.viewport) {
			const currentRotation = viewerRef.current.viewport.getRotation()
			viewerRef.current.viewport.setRotation(currentRotation - 90)
		}
	}

	const rotateRight = () => {
		if (viewerRef.current?.viewport) {
			const currentRotation = viewerRef.current.viewport.getRotation()
			viewerRef.current.viewport.setRotation(currentRotation + 90)
		}
	}

	const toggleSegments = () => {
		setShowSegments(!showSegments)
	}

	const uniqueNodes = getUniqueNodes()

	return (
		<div style={{ position: 'relative', width: '100%', height }}>
			{/* Легенда узлов слева */}
			{showSegments && uniqueNodes.length > 0 && (
				<div
					style={{
						position: 'absolute',
						top: '20px',
						left: '20px',
						zIndex: 1000,
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						backgroundColor: 'rgba(255, 255, 255, 0.95)',
						padding: '12px 8px',
						borderRadius: '12px',
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
						border: '1px solid rgba(0,0,0,0.1)',
						minWidth: '140px',
						maxHeight: 'calc(100% - 40px)',
						overflowY: 'auto',
					}}
				>
					<div
						style={{
							fontSize: '14px',
							fontWeight: 'bold',
							textAlign: 'center',
							color: '#333',
							marginBottom: '8px',
							borderBottom: '1px solid #eee',
							paddingBottom: '4px',
						}}
					>
						Узлы:
					</div>
					{uniqueNodes.map(node => (
						<div
							key={node.id}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								fontSize: '13px',
								color: '#555',
								padding: '4px 0',
							}}
						>
							<div
								style={{
									width: '14px',
									height: '14px',
									backgroundColor: node.color,
									borderRadius: '3px',
									border: '1px solid rgba(0,0,0,0.2)',
									flexShrink: 0,
								}}
							></div>
							<span style={{ flex: 1 }}>Узел {node.displayIndex}</span>
							<span
								style={{
									fontSize: '11px',
									backgroundColor: '#f0f0f0',
									padding: '2px 6px',
									borderRadius: '10px',
									fontWeight: 'bold',
								}}
							>
								TI-RADS {node.type}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Панель управления справа */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					right: '10px',
					transform: 'translateY(-50%)',
					zIndex: 1000,
					display: 'flex',
					flexDirection: 'column',
					gap: '8px',
					backgroundColor: 'rgba(255, 255, 255, 0.95)',
					padding: '12px 8px',
					borderRadius: '12px',
					boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
					border: '1px solid rgba(0,0,0,0.1)',
					minWidth: '120px',
				}}
			>
				{/* Управление зумом */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '4px',
						alignItems: 'center',
					}}
				>
					<button
						onClick={zoomIn}
						style={{
							padding: '8px 12px',
							cursor: 'pointer',
							backgroundColor: '#2196F3',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '20px',
							fontWeight: 'bold',
							minWidth: '44px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						}}
					>
						+
					</button>

					<div style={{ fontSize: '15px', color: '#666', textAlign: 'center' }}>
						{Math.round(zoomLevel * 100)}%
					</div>

					<button
						onClick={zoomOut}
						style={{
							padding: '8px 12px',
							cursor: 'pointer',
							backgroundColor: '#2196F3',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '20px',
							fontWeight: 'bold',
							minWidth: '44px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						}}
					>
						-
					</button>
				</div>

				<div
					style={{ height: '1px', backgroundColor: '#ddd', margin: '4px 0' }}
				></div>

				{/* Кнопка Fit */}
				<button
					onClick={fitToScreen}
					style={{
						padding: '8px 6px',
						cursor: 'pointer',
						backgroundColor: '#FF9800',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						fontSize: '15px',
						fontWeight: 'bold',
						minWidth: '44px',
						boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
					}}
				>
					Fit
				</button>

				<div
					style={{ height: '1px', backgroundColor: '#ddd', margin: '4px 0' }}
				></div>

				{/* Управление поворотом */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '4px',
						alignItems: 'center',
					}}
				>
					<button
						onClick={rotateLeft}
						style={{
							padding: '8px 12px',
							cursor: 'pointer',
							backgroundColor: '#9C27B0',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '20px',
							fontWeight: 'bold',
							minWidth: '44px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						}}
					>
						↶
					</button>

					<div style={{ fontSize: '15px', color: '#666', textAlign: 'center' }}>
						Поворот
					</div>

					<button
						onClick={rotateRight}
						style={{
							padding: '8px 12px',
							cursor: 'pointer',
							backgroundColor: '#9C27B0',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '20px',
							fontWeight: 'bold',
							minWidth: '44px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						}}
					>
						↷
					</button>
				</div>

				<div
					style={{ height: '1px', backgroundColor: '#ddd', margin: '4px 0' }}
				></div>

				{/* Показать/скрыть сегменты */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '4px',
						alignItems: 'center',
					}}
				>
					<button
						onClick={toggleSegments}
						style={{
							padding: '8px 6px',
							cursor: 'pointer',
							backgroundColor: showSegments ? '#4CAF50' : '#f44336',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							fontSize: '15px',
							fontWeight: 'bold',
							minWidth: '100px',
							boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
						}}
					>
						{showSegments ? 'Скрыть' : 'Показать'}
					</button>

					<div
						style={{
							fontSize: '15px',
							color: showSegments ? '#4CAF50' : '#f44336',
						}}
					>
						{showSegments ? 'ВКЛ' : 'ВЫКЛ'}
					</div>
				</div>

				{/* Навигация по страницам - ТОЛЬКО ЭТИ КНОПКИ */}
				{totalPages > 1 && (
					<>
						<div
							style={{
								height: '1px',
								backgroundColor: '#ddd',
								margin: '4px 0',
							}}
						></div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								gap: '8px',
							}}
						>
							<button
								onClick={prevPage}
								disabled={isLoadingPage}
								style={{
									padding: '8px 12px',
									cursor: isLoadingPage ? 'not-allowed' : 'pointer',
									backgroundColor: isLoadingPage ? '#999' : '#666',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									fontSize: '20px',
									fontWeight: 'bold',
									boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
									opacity: isLoadingPage ? 0.7 : 1,
								}}
							>
								←
							</button>

							<div
								style={{
									fontSize: '14px',
									color: '#666',
									fontWeight: 'bold',
									minWidth: '60px',
									textAlign: 'center',
								}}
							>
								{currentPage + 1}/{totalPages}
							</div>

							<button
								onClick={nextPage}
								disabled={isLoadingPage}
								style={{
									padding: '8px 12px',
									cursor: isLoadingPage ? 'not-allowed' : 'pointer',
									backgroundColor: isLoadingPage ? '#999' : '#666',
									color: 'white',
									border: 'none',
									borderRadius: '8px',
									fontSize: '20px',
									fontWeight: 'bold',
									boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
									opacity: isLoadingPage ? 0.7 : 1,
								}}
							>
								→
							</button>
						</div>
					</>
				)}
			</div>

			{/* Индикатор номера слайда внизу по центру - УБРАН */}
			{/* {totalPages > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
        }}>
          Слайд: {currentPage + 1} / {totalPages}
        </div>
      )} */}

			{/* Контейнер OpenSeadragon */}
			<div
				ref={containerRef}
				style={{
					width: '100%',
					height: '100%',
					backgroundColor: '#f5f5f5',
				}}
			/>
		</div>
	)
}

export default OpenSeadragonViewer
