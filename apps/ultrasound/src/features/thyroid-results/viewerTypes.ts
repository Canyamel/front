import type {
	Segment as ThyroidSegment,
	SegmentDraftChange,
	SegmentPoint,
} from './thyroidResultsTypes'
import type { ThyroidStructureJson } from './demoThyroidStructures'

export interface ImageTile {
	type: 'image'
	url: string
	width?: number
	height?: number
}

export interface GalleryProps {
	url: string
	link1: string | null
	seg: ThyroidSegment[]
	imageid: string | number
	date?: string
	image_count: number
	slide_template?: string[]
	slide_urls?: string[]
	isEditMode?: boolean
	currentGroup?: string | number
	onStartEdit?: () => void
	onSaveEdit?: () => void | Promise<void>
	onCancelEdit?: () => void
	isSaving?: boolean
	hasUnsavedChanges?: boolean
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
	viewerResetKey?: number
	viewerHeight?: number
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

export interface TiffImagePreparerProps {
	slide_urls?: string[]
	slide_template?: string[]
	image_count?: number
}

export interface AnnotoriousViewerApi {
	flushPendingSelection: () => Promise<void>
}

export interface ImageSource {
	type: string
	url: string
	width?: number
	height?: number
}

export interface OpenSeadragonViewerProps {
	image: ImageSource | ImageSource[]
	tool: string
	url: string
	seg: ThyroidSegment[]
	imageid: string | number
	readOnly?: boolean
	height?: number
	currentGroup?: string | number
	onDraftChangesChange?: (changes: SegmentDraftChange[]) => void
	onViewerApiReady?: (api: AnnotoriousViewerApi) => void
	thyroidStructures?: ThyroidStructureJson
}

export type ViewerSegmentPoint = SegmentPoint
