import './viewer.scss'

import React, { useMemo, useState } from 'react'
import { Typography } from 'antd'
import { AnnotatedStudyViewer } from '@medml/viewers'
import type { ViewerAnnotationApi, ViewerImage, ViewerStatus } from '@medml/viewers'

import { useDziTileSource } from '@/lib/useDziTileSource'

import type { ISegmentStack, SegmentType } from '../core/types/segments'
import type { CytologyContourDrafts } from '../model/types'
import CytologyContourCard from './CytologyContourCard'
import { CYTOLOGY_VIEWER_TOOLS, CYTOLOGY_ZOOM_LIMITS } from './constants'
import type { CytologyAnnotationData } from './cytologyAnnotations'
import { useCytologyContours } from './useCytologyContours'

export interface CytologyStudyViewerProps {
	imageUrl: string | undefined
	segments: ISegmentStack[]
	segmentTypeColors: Record<string, string>
	currentType: SegmentType | null
	drafts?: CytologyContourDrafts
	annotationApiRef?: React.Ref<ViewerAnnotationApi>
	readOnly?: boolean
	height?: number | string
}

/**
 * Доменная обёртка над `<AnnotatedStudyViewer />` (`@medml/viewers`).
 *
 * Всё рабочее место — инструменты, линейка с калибровкой, кисть, легенда,
 * состояния загрузки, разметка на Annotorious — в общем вьюере. Здесь
 * доменное: DZI-тайлы снимка, сегменты как контуры (`useCytologyContours`)
 * и карточка сегмента.
 */
const CytologyStudyViewer: React.FC<CytologyStudyViewerProps> = ({
	imageUrl,
	segments,
	segmentTypeColors,
	currentType,
	drafts,
	annotationApiRef,
	readOnly = true,
	height = 600,
}) => {
	const { tileSource, isLoading, error } = useDziTileSource(imageUrl ?? '')
	const [annotationsVisible, setAnnotationsVisible] = useState(true)

	const editableDrafts = readOnly ? undefined : drafts
	const { annotations, onChange, style, createData, legendItems } = useCytologyContours({
		segments,
		drafts: editableDrafts,
		currentType,
		annotationsVisible,
		segmentTypeColors,
	})

	// Ссылка на массив должна быть стабильной: общий вьюер пересоздаёт инстанс
	// OSD при смене `images`, а вместе с инстансом уходит и слой разметки.
	//
	// Размеры снимка берём из манифеста DZI: без них кисть не знает, какого
	// размера делать маску (маска живёт в координатах изображения).
	const images = useMemo<ViewerImage[]>(
		() =>
			tileSource && imageUrl
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

	const status = useMemo<ViewerStatus | null>(() => {
		if (!imageUrl) return { kind: 'empty', title: 'Изображение отсутствует' }
		if (error) return { kind: 'error', title: 'Не удалось загрузить изображение', description: error }
		if (isLoading || !tileSource) return { kind: 'loading' }
		return null
	}, [imageUrl, error, isLoading, tileSource])

	return (
		<div className='cytology-study-viewer'>
			<AnnotatedStudyViewer<CytologyAnnotationData>
				images={images}
				annotations={annotations}
				annotationStyle={style}
				onAnnotationChange={onChange}
				newAnnotationData={createData}
				annotationApiRef={annotationApiRef}
				// Без выбранного типа сегмента нарисованный контур некуда сохранить.
				canDraw={currentType != null}
				renderAnnotationPopup={context => (
					<CytologyContourCard {...context} onRestore={() => editableDrafts?.discard(context.annotation.id)} />
				)}
				tools={CYTOLOGY_VIEWER_TOOLS}
				readOnly={readOnly}
				height={height}
				status={status}
				navigationEnabled={false}
				zoomLimits={CYTOLOGY_ZOOM_LIMITS}
				zoomUnit='native'
				legendItems={legendItems}
				legendTitle='Сегменты:'
				annotationsVisible={annotationsVisible}
				onAnnotationsVisibleChange={setAnnotationsVisible}
				// В режиме просмотра рисовать нечем, и подсказка про выбор группы
				// была бы не к месту: панель там показывает только линейку и масштаб.
				toolPanelExtra={
					!readOnly && currentType == null ? (
						<Typography.Text type='secondary'>Выберите группу сегментов справа, чтобы рисовать</Typography.Text>
					) : null
				}
			/>
		</div>
	)
}

export default CytologyStudyViewer
