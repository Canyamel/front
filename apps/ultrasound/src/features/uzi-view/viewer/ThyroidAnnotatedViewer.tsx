import './viewer.scss'

import { useEffect, useMemo, useState } from 'react'
import { AnnotatedStudyViewer, contourGroupSizePx, formatMm, pxToMm } from '@medml/viewers'
import type { ViewerImage, ViewerLegendItem } from '@medml/viewers'

import { useThyroidAnnotator } from './useThyroidAnnotator'
import { UZI_VIEWER_TOOLS } from './constants'
import type { ThyroidAnnotatedViewerProps } from './types'

/**
 * Доменная обёртка над `<AnnotatedStudyViewer />` (`@medml/viewers`).
 *
 * Всё поведение рабочего места — инструменты, линейка с калибровкой, кисть,
 * легенда, состояния загрузки — живёт в общем вьюере. Здесь остаётся только
 * доменное: кадры снимка УЗИ, слой разметки на Annotorious 2
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
	thyroidStructures,
}: ThyroidAnnotatedViewerProps) => {
	const [currentPage, setCurrentPage] = useState(0)
	const [annotationsVisible, setAnnotationsVisible] = useState(true)
	const [pxPerMm, setPxPerMm] = useState<number | null>(null)

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

	const { layer, uniqueNodes, flushPendingSelection } = useThyroidAnnotator({
		images,
		seg,
		readOnly,
		currentPage,
		annotationsVisible,
		currentGroup,
		thyroidStructures,
		onDraftChangesChange,
	})

	// Императивный API отдаём наружу: галерея дожидается несохранённого
	// выделения перед отправкой сегментов на бэкенд.
	useEffect(() => {
		onViewerApiReady?.({ flushPendingSelection })
	}, [flushPendingSelection, onViewerApiReady])

	/**
	 * Легенда: цвет, номер узла, TI-RADS и — после калибровки — габариты
	 * образования. Именно эти значения врач переносит в форму заключения.
	 */
	const legendItems = useMemo<ViewerLegendItem[]>(
		() =>
			uniqueNodes.map(node => {
				const segment = seg.find(item => item.id === node.id)
				const size = contourGroupSizePx(segment?.data)
				const width = size ? pxToMm(size.widthPx, pxPerMm) : null
				const height = size ? pxToMm(size.heightPx, pxPerMm) : null

				return {
					id: node.id,
					color: node.color,
					title: `Узел ${node.displayIndex}`,
					subtitle:
						width != null && height != null
							? `${formatMm(width)} × ${formatMm(height)}`
							: null,
					badge: `TI-RADS ${node.type}`,
				}
			}),
		[uniqueNodes, seg, pxPerMm],
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
			onPxPerMmChange={setPxPerMm}
			legendItems={legendItems}
			legendTitle='Узлы:'
			annotationsVisible={annotationsVisible}
			onAnnotationsVisibleChange={setAnnotationsVisible}
		/>
	)
}

export default ThyroidAnnotatedViewer
