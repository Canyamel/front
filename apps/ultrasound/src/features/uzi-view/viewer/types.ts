import type React from 'react'
import type { ViewerAnnotationApi, ViewerStatus } from '@medml/viewers'
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
	thyroidStructures?: ThyroidStructureJson
}
