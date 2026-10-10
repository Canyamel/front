import './viewer.scss'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnnotatedStudyViewer, ViewerAnnotationsToggle, contourGroupSizePx, formatMm, pxToMm } from '@medml/viewers'
import type { ViewerImage, ViewerLegendItem } from '@medml/viewers'

import { useUziContours } from './useUziContours'
import UziContourCard from './UziContourCard'
import type { UziAnnotationData } from './uziAnnotations'
import { UZI_VIEWER_TOOLS } from './constants'
import type { UziStudyViewerProps } from './types'

/**
 * Доменная обёртка над `<AnnotatedStudyViewer />` (`@medml/viewers`).
 *
 * Всё поведение рабочего места — инструменты, линейка с калибровкой, кисть,
 * легенда, состояния загрузки — живёт в общем вьюере. Здесь остаётся только
 * доменное: кадры снимка УЗИ, контуры узлов и структур ЩЖ по кадрам
 * (`useUziContours`), карточка контура и подписи легенды с габаритами
 * узлов в миллиметрах.
 */
const UziStudyViewer = ({
	image,
	segments,
	imageid,
	drafts,
	readOnly = true,
	height = 600,
	status,
	currentGroup,
	annotationApiRef,
	onPxPerMmChange,
	initialPxPerMm = null,
	thyroidStructures,
}: UziStudyViewerProps) => {
	const [currentPage, setCurrentPage] = useState(0)
	const [annotationsVisible, setAnnotationsVisible] = useState(true)
	const [structuresVisible, setStructuresVisible] = useState(true)
	const [pxPerMm, setPxPerMm] = useState<number | null>(initialPxPerMm)

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
			tileSource: tile as unknown as ViewerImage['tileSource'],
			width: tile.width,
			height: tile.height,
		}))
	}, [image, imageid])

	const { annotations, onChange, style, createData, displaySegments, uniqueNodes, structureItems, hasStructures } =
		useUziContours({
			images,
			segments,
			drafts: readOnly ? undefined : drafts,
			currentPage,
			annotationsVisible,
			structuresVisible,
			currentGroup,
			thyroidStructures,
		})

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

	const legendItems = useMemo<ViewerLegendItem[]>(
		() => [
			...uniqueNodes.map((node): ViewerLegendItem => {
				const segment = displaySegments.find(item => item.id === node.id)
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
		[uniqueNodes, displaySegments, pxPerMm, structuresVisible, structureItems],
	)

	return (
		<AnnotatedStudyViewer<UziAnnotationData>
			images={images}
			annotations={annotations}
			annotationStyle={style}
			onAnnotationChange={onChange}
			newAnnotationData={createData}
			annotationApiRef={annotationApiRef}
			// Новый контур некуда сохранить, пока не выбран узел.
			canDraw={currentGroup != null}
			renderAnnotationPopup={context => <UziContourCard {...context} nodes={uniqueNodes} />}
			tools={UZI_VIEWER_TOOLS}
			readOnly={readOnly}
			height={height}
			status={status}
			onIndexChange={setCurrentPage}
			onPxPerMmChange={handlePxPerMmChange}
			initialPxPerMm={initialPxPerMm}
			legendItems={legendItems}
			legendTitle={uniqueNodes.length > 0 ? 'Узлы:' : 'Структуры ЩЖ:'}
			annotationsVisible={annotationsVisible}
			onAnnotationsVisibleChange={setAnnotationsVisible}
			annotationsToggleLabel={hasStructures ? 'Узлы' : undefined}
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

export default UziStudyViewer
