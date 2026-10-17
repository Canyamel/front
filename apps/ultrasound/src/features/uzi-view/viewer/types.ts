import type React from 'react'
import type { ViewerAnnotationApi, ViewerPixelSpacing, ViewerStatus } from '@medml/viewers'
import type { Segment, UziContourDrafts } from '../model/types'
import type { ImageTile } from '../gallery/types'
import type { ThyroidStructureJson } from '../structures'

export interface UziStudyViewerProps {
	image: ImageTile | ImageTile[]
	segments: Segment[]
	imageid: string | number
	drafts?: UziContourDrafts
	readOnly?: boolean
	height?: number
	/** Состояние вместо снимка: кадры готовятся, ошибка подготовки и т.п. */
	status?: ViewerStatus | null
	currentGroup?: string | number
	/** Досохранить правку выделенного контура перед сохранением. */
	annotationApiRef?: React.Ref<ViewerAnnotationApi>
	onPxPerMmChange?: (pxPerMm: number | null) => void
	/** Сохранённый ручной масштаб исследования, пикселей на мм. */
	initialPxPerMm?: number | null
	/** Размер пикселя из метаданных файла (`w_pixel_spacing` / `h_pixel_spacing`). */
	filePixelSpacing?: ViewerPixelSpacing
	thyroidStructures?: ThyroidStructureJson
}
