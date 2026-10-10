import type { Segment } from '../model/types'
import type { UziContourEditor } from '../model/useUziContourEditor'
import type { ThyroidStructureJson } from '../structures'

/**
 * Кадр снимка в виде, пригодном для OSD tileSource.
 */
export interface ImageTile {
	type: 'image'
	url: string
	width?: number
	height?: number
}

export interface TiffSlidesOptions {
	slide_urls?: string[]
	slide_template?: string[]
	image_count?: number
}

export interface GalleryProps {
	link1: string | null
	segments: Segment[]
	imageid: string | number
	image_count: number
	slide_template?: string[]
	slide_urls?: string[]
	contourEditor: UziContourEditor
	currentGroup?: string | number
	viewerHeight?: number
	onPxPerMmChange?: (pxPerMm: number | null) => void
	initialPxPerMm?: number | null
	thyroidStructures?: ThyroidStructureJson
}

export interface GalleryToolbarProps {
	isEditMode: boolean
	currentGroup?: string | number
	segmentOptions?: Array<{ value: string | number; label: string }>
	onSelectGroup?: (value: string | number) => void
	onStartEdit?: () => void
	onSave?: () => void | Promise<void>
	onCancel?: () => void
	isSaving?: boolean
	hasUnsavedChanges?: boolean
}
