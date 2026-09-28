import type { CytologySegmentStack } from '@/lib/cytologyApi'

import type { ISegmentStack, SegmentType } from '../types/segments'

export function mapToSegmentStack(segments: CytologySegmentStack[]): ISegmentStack[] {
	return segments.map(segment => ({
		...segment,
		seg_type: segment.seg_type as SegmentType,
	}))
}
