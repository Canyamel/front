import { createContext, useContext } from 'react'

import type { ICytologyInfo } from '../core/types/cytology'
import type { ISegmentStack, ISegmentType, SegmentType } from '../core/types/segments'
import type { CytologyContourEditor } from './useCytologyContourEditor'

/**
 * Состояние страницы исследования для панели справа. Собирает его
 * `CytologyViewPage`; отдельного Redux-стора у страницы нет.
 *
 * Модалки (`ModalContext.open`) рисуются в корне приложения, вне этого
 * контекста, — им данные и колбэки передаются пропсами.
 */
export interface CytologyViewContextValue {
	cytologyId: string
	info: ICytologyInfo | undefined
	segmentTypes: ISegmentType[]
	segments: ISegmentStack[]
	currentType: SegmentType | null
	setCurrentType: (type: SegmentType | null) => void
	editor: CytologyContourEditor
}

const CytologyViewContext = createContext<CytologyViewContextValue | null>(null)

export const CytologyViewProvider = CytologyViewContext.Provider

export function useCytologyView(): CytologyViewContextValue {
	const value = useContext(CytologyViewContext)
	if (!value) throw new Error('useCytologyView: нет CytologyViewProvider выше по дереву')
	return value
}
