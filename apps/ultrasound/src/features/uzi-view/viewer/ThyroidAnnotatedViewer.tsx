import './viewer.scss'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnnotatedStudyViewer, ViewerAnnotationsToggle, contourGroupSizePx, formatMm, pxToMm } from '@medml/viewers'
import type { ViewerImage, ViewerLegendItem } from '@medml/viewers'

import { useThyroidAnnotator } from './useThyroidAnnotator'
import ThyroidAnnotationPopup from './ThyroidAnnotationPopup'
import { UZI_VIEWER_TOOLS } from './constants'
import type { ThyroidAnnotatedViewerProps } from './types'

/**
 * Доменная обёртка над `<AnnotatedStudyViewer />` (`@medml/viewers`).
 *
 * Всё поведение рабочего места — инструменты, линейка с калибровкой, кисть,
 * легенда, состояния загрузки — живёт в общем вьюере. Здесь остаётся только
 * доменное: кадры снимка УЗИ, слой разметки на Annotorious 3
 * (`useThyroidAnnotator`) и подписи легенды с габаритами узлов в миллиметрах.
 */
const ThyroidAnnotatedViewer = ({
	image,
	seg,
	imageid,
	readOnly = true,
	height = 600,
	status,
	currentGroup,
	onDraftChangesChange,
	onViewerApiReady,
	onPxPerMmChange,
	thyroidStructures,
}: ThyroidAnnotatedViewerProps) => {
	const [currentPage, setCurrentPage] = useState(0)
	const [annotationsVisible, setAnnotationsVisible] = useState(true)
	const [structuresVisible, setStructuresVisible] = useState(true)
	const [pxPerMm, setPxPerMm] = useState<number | null>(null)

	// Масштаб нужен не только легенде, но и заключению (размеры узлов в мм),
	// поэтому поднимаем его наверх.
	const handlePxPerMmChange = useCallback(
		(next: number | null) => {
			setPxPerMm(next)
			onPxPerMmChange?.(next)
		},
		[onPxPerMmChange],
	)

	const images: ViewerImage[] = useMemo(() => {
		const list = Array.isArray(image) ? image : image ? [image] : []
		return list.map((tile, index) => ({
			id: `${imageid}-${index}`,
			url: tile.url,
			// ImageTile уже является валидным OSD tileSource ({ type: 'image', url, ... }).
			tileSource: tile as unknown as ViewerImage['tileSource'],
			width: tile.width,
			height: tile.height,
		}))
	}, [image, imageid])

	const {
		layer,
		annotator,
		selected,
		removeAnnotation,
		uniqueNodes,
		structureItems,
		hasStructures,
		flushPendingSelection,
	} = useThyroidAnnotator({
		images,
		seg,
		readOnly,
		currentPage,
		annotationsVisible,
		structuresVisible,
		currentGroup,
		thyroidStructures,
		onDraftChangesChange,
	})

	// Кадры многокадрового снимка — отдельные PNG, OpenSeadragon грузит их по
	// одному в момент перелистывания, и снимок на мгновение «перерисовывается».
	// Соседние кадры подгружаем заранее: при смене кадра он уже в кеше браузера.
	useEffect(() => {
		if (images.length < 2) return
		for (const index of [currentPage + 1, currentPage + 2, currentPage - 1]) {
			const url = images[index]?.url
			if (url) {
				const preload = new Image()
				preload.src = url
			}
		}
	}, [images, currentPage])

	// Императивный API отдаём наружу: галерея дожидается несохранённого
	// выделения перед отправкой сегментов на бэкенд.
	useEffect(() => {
		onViewerApiReady?.({ flushPendingSelection })
	}, [flushPendingSelection, onViewerApiReady])

	const legendItems = useMemo<ViewerLegendItem[]>(
		() => [
			...uniqueNodes.map((node): ViewerLegendItem => {
				const segment = seg.find(item => item.id === node.id)
				const size = contourGroupSizePx(segment?.data)
				const width = size ? pxToMm(size.widthPx, pxPerMm) : null
				const height = size ? pxToMm(size.heightPx, pxPerMm) : null

				return {
					id: node.id,
					color: node.color,
					title: `Узел ${node.displayIndex}`,
					subtitle: width != null && height != null ? `${formatMm(width)} × ${formatMm(height)}` : null,
					badge: `TI-RADS ${node.type}`,
					muted: !node.onPage,
					hint: node.onPage ? undefined : 'На этом кадре контура нет',
				}
			}),
			...(structuresVisible
				? structureItems.map(
						(item): ViewerLegendItem => ({
							id: `structure-${item.key}`,
							color: item.color,
							title: item.label,
							badge: item.confidence != null ? `${Math.round(item.confidence * 100)}%` : null,
							section: 'Структуры ЩЖ:',
							dashed: true,
						}),
					)
				: []),
		],
		[uniqueNodes, seg, pxPerMm, structuresVisible, structureItems],
	)

	return (
		<AnnotatedStudyViewer
			images={images}
			annotationLayer={layer}
			tools={UZI_VIEWER_TOOLS}
			readOnly={readOnly}
			height={height}
			status={status}
			onIndexChange={setCurrentPage}
			onPxPerMmChange={handlePxPerMmChange}
			legendItems={legendItems}
			legendTitle={uniqueNodes.length > 0 ? 'Узлы:' : 'Структуры ЩЖ:'}
			annotationsVisible={annotationsVisible}
			onAnnotationsVisibleChange={setAnnotationsVisible}
			annotationsToggleLabel={hasStructures ? 'Узлы' : undefined}
			overlaySlot={
				<ThyroidAnnotationPopup
					viewer={annotator?.viewer ?? null}
					annotation={selected}
					nodes={uniqueNodes}
					readOnly={readOnly}
					onRemove={removeAnnotation}
				/>
			}
			customToolbarSlot={
				hasStructures ? (
					<ViewerAnnotationsToggle
						label='Доли'
						visible={structuresVisible}
						onToggle={() => setStructuresVisible(prev => !prev)}
					/>
				) : undefined
			}
		/>
	)
}

export default ThyroidAnnotatedViewer
