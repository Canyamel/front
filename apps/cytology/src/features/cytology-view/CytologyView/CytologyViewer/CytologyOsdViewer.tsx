import React, { useMemo, useState } from 'react'
import { Typography } from 'antd'
import {
	AnnotatedStudyViewer,
	BRUSH_TOOL,
	CALIBRATE_TOOL,
	PAN_TOOL,
	RULER_TOOL,
} from '@medml/viewers'
import type {
	ViewerImage,
	ViewerLegendItem,
	ViewerStatus,
	ViewerToolId,
	ViewerZoomLimits,
} from '@medml/viewers'

import { useDziTileSource } from '@/lib/useDziTileSource'

import { useAppSelector } from '@cytology/core/hooks'
import { ISegmentStack } from '@cytology/core/types/segments'

import { useCytologyAnnotator } from './useCytologyAnnotator'
import SegmentPopup from './SegmentPopup'
import { createSelectStyleFromConfig } from './Viewer/utils/selectStyleFromConfig'
import { IPoint } from './Viewer/interfaces/queries'

import './Viewer/viewer.scss'

/**
 * Просмотр снимка цитологии на общем движке `@medml/viewers`.
 *
 * Рабочее место целиком собирает `<AnnotatedStudyViewer />` — то же самое,
 * что и в УЗИ. Отсюда приходит доменное: DZI-тайлы снимка, слой разметки на
 * Annotorious 3 и карточка выбранного сегмента.
 */

interface CytologyOsdViewerProps {
	imageUrl: string
	drawingEnabled?: boolean
	/** Выбрана ли группа сегментов: без неё рисовать некуда. */
	selected: boolean
	needPopup?: boolean
	className?: string
	height?: number | string
	segments?: ISegmentStack[]
	segmentTypeColors?: Record<string, string>
	legendItems?: ViewerLegendItem[]
	addSegment: (contour: IPoint[]) => void
	changeSegment: (segmentId: string, contour: IPoint[]) => void
}

/**
 * Инструменты цитологии: рисование отдаём Annotorious 3 (он знает
 * `rectangle` и `polygon`), остальное обслуживает сам вьюер. Линейка,
 * задание масштаба и кисть появились здесь вместе с унификацией — раньше
 * они были только в УЗИ.
 */
const CYTOLOGY_VIEWER_TOOLS: ViewerToolId[] = [
	PAN_TOOL,
	'rectangle',
	'polygon',
	BRUSH_TOOL,
	RULER_TOOL,
	CALIBRATE_TOOL,
]

/**
 * Снимки цитологии — гигапиксельные WSI: потолок «×10 от вписанного» для них
 * слишком низкий. Ограничиваем только плотностью: до 4 экранных пикселей на
 * пиксель исходника. Зум показываем кратностью к исходному разрешению.
 */
const CYTOLOGY_ZOOM_LIMITS: ViewerZoomLimits = { maxZoomLevel: null, maxZoomPixelRatio: 4 }

const CytologyOsdViewer: React.FC<CytologyOsdViewerProps> = ({
	imageUrl,
	drawingEnabled = false,
	selected,
	needPopup = false,
	className,
	height = 600,
	segments = [],
	segmentTypeColors = {},
	legendItems = [],
	addSegment,
	changeSegment,
}) => {
	const { tileSource, isLoading, error } = useDziTileSource(imageUrl)
	const currentSegment = useAppSelector(state => state.segment.currentSegment)

	const [annotationsVisible, setAnnotationsVisible] = useState(true)
	// Масштаб задаёт вьюер (калибровка по эталонному отрезку); нужен карточке
	// сегмента, чтобы показать его размер в миллиметрах.
	const [pxPerMm, setPxPerMm] = useState<number | null>(null)

	// Ссылка на массив должна быть стабильной: общий вьюер пересоздаёт инстанс
	// OSD при смене `images`, а вместе с инстансом уходит и слой разметки.
	//
	// Размеры снимка берём из манифеста DZI: без них кисть не знает, какого
	// размера делать маску (маска живёт в координатах изображения).
	const images = useMemo<ViewerImage[]>(
		() =>
			tileSource
				? [
						{
							id: imageUrl,
							url: '',
							tileSource: tileSource as ViewerImage['tileSource'],
							width: tileSource.width,
							height: tileSource.height,
						},
					]
				: [],
		[imageUrl, tileSource],
	)

	const style = useMemo(
		() =>
			createSelectStyleFromConfig(segmentTypeColors, {
				isEditMode: drawingEnabled,
				activeSegmentType: currentSegment,
			}),
		[segmentTypeColors, drawingEnabled, currentSegment],
	)

	const { annotator, layer } = useCytologyAnnotator({
		// Скрытая разметка — это пустой набор аннотаций: у Annotorious 3 нет
		// отдельного переключателя видимости слоя.
		segments: annotationsVisible ? segments : [],
		style,
		drawingEnabled: drawingEnabled && selected,
		onAddSegment: addSegment,
		onChangeSegment: changeSegment,
	})

	const status = useMemo<ViewerStatus | null>(() => {
		if (!imageUrl) return { kind: 'empty', title: 'Изображение отсутствует' }
		if (error) {
			return { kind: 'error', title: 'Не удалось загрузить изображение', description: error }
		}
		if (isLoading || !tileSource) return { kind: 'loading' }
		return null
	}, [imageUrl, error, isLoading, tileSource])

	const overlaySlot = useMemo(
		() =>
			needPopup ? (
				<SegmentPopup annotator={annotator} isEditingMode={drawingEnabled} pxPerMm={pxPerMm} />
			) : null,
		[needPopup, annotator, drawingEnabled, pxPerMm],
	)

	return (
		<div className={`viewer-wrapper ${className ?? ''}`}>
			<AnnotatedStudyViewer
				images={images}
				annotationLayer={layer}
				tools={CYTOLOGY_VIEWER_TOOLS}
				readOnly={!drawingEnabled}
				height={height}
				status={status}
				navigationEnabled={false}
				zoomLimits={CYTOLOGY_ZOOM_LIMITS}
				zoomUnit='native'
				onPxPerMmChange={setPxPerMm}
				legendItems={legendItems}
				legendTitle='Сегменты:'
				annotationsVisible={annotationsVisible}
				onAnnotationsVisibleChange={setAnnotationsVisible}
				overlaySlot={overlaySlot}
				// В режиме просмотра рисовать нечем, и подсказка про выбор группы
				// была бы не к месту: панель там показывает только линейку и масштаб.
				toolPanelExtra={
					drawingEnabled && !selected ? (
						<Typography.Text type='secondary'>
							Выберите группу сегментов справа, чтобы рисовать
						</Typography.Text>
					) : null
				}
			/>
		</div>
	)
}

export default CytologyOsdViewer
