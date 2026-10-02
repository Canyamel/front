import type { ViewerAnnotation } from '@medml/viewers'

import { ISegmentDetails, ISegmentStack, SegmentType } from '@cytology/core/types/segments'

/** Доменные данные контура сегмента: по ним строятся стиль и карточка. */
export interface SegmentAnnotationData {
	ai?: boolean
	seg_type?: SegmentType
	toDelete?: boolean
	toUpdate?: boolean
	toAdd?: boolean
	details?: ISegmentDetails
}

export type SegmentAnnotation = ViewerAnnotation<SegmentAnnotationData>

export const generateAnnotation = (segment: ISegmentStack): SegmentAnnotation => ({
	id: String(segment.id),
	points: segment.points.map(point => ({ x: point.x, y: point.y })),
	data: {
		ai: segment.is_ai,
		seg_type: segment.seg_type,
		toDelete: segment.isDeleted,
		toUpdate: segment.isEdited,
		toAdd: segment.isNew,
		details: segment.details,
	},
})
