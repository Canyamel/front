import type React from 'react'
import type { ViewerAnnotationApi, ViewerStatus } from '@medml/viewers'
import type { Segment, SegmentDraftChange } from '../model/types'
import type { ImageTile } from '../gallery/types'
import type { ThyroidStructureJson } from '../structures'

export interface ThyroidAnnotatedViewerProps {
	image: ImageTile | ImageTile[]
	seg: Segment[]
	imageid: string | number
	readOnly?: boolean
	height?: number
	/** Состояние вместо снимка: кадры готовятся, ошибка подготовки и т.п. */
	status?: ViewerStatus | null
	currentGroup?: string | number
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
	/** Досохранить правку выделенного контура перед сохранением (см. `Gallery`). */
	annotationApiRef?: React.Ref<ViewerAnnotationApi>
	onPxPerMmChange?: (pxPerMm: number | null) => void
	thyroidStructures?: ThyroidStructureJson
}
