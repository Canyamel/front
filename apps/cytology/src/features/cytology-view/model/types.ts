import type { ContourDraft, ContourDrafts } from '@medml/viewers'

import type { IPoint, SegmentType } from '../core/types/segments'

/**
 * Несохранённые правки сегментов.
 *
 * Ключ — id сегмента на сервере, у нового сегмента — id, который ему дал
 * вьюер.
 */
export interface CytologyContourDraftData {
	segType: SegmentType
}

export type CytologyContourDraft = ContourDraft<IPoint[], CytologyContourDraftData>
export type CytologyContourDrafts = ContourDrafts<IPoint[], CytologyContourDraftData>
