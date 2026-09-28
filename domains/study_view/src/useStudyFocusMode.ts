import { useState, type Dispatch, type SetStateAction } from 'react'
import { Grid } from 'antd'

/**
 * Режим фокуса на снимке: соседние блоки страницы можно убрать, снимок при
 * этом становится выше.
 *
 * Живёт в домене, а не в `@medml/viewers`: это поведение страницы
 * исследования, а не движка просмотра — здесь нет ни OpenSeadragon, ни
 * разметки, только флаги видимости блоков и высота области снимка. И в УЗИ,
 * и в цитологии страница устроена одинаково: сводка сверху, снимок слева,
 * панель справа.
 */

export interface StudyFocusMode {
	showOverview: boolean
	setShowOverview: Dispatch<SetStateAction<boolean>>
	showSidebar: boolean
	setShowSidebar: Dispatch<SetStateAction<boolean>>
	isViewerFocused: boolean
	viewerHeight: number
	toggleFocus: () => void
}

function resolveViewerHeight(isNarrow: boolean, isMedium: boolean, hiddenCount: number): number {
	if (isNarrow) return 360
	if (isMedium) return 480
	if (hiddenCount === 2) return 820
	if (hiddenCount === 1) return 720
	return 600
}

export function useStudyFocusMode(): StudyFocusMode {
	const screens = Grid.useBreakpoint()

	const [showOverview, setShowOverview] = useState(true)
	const [showSidebar, setShowSidebar] = useState(true)

	const isViewerFocused = !showOverview && !showSidebar
	const hiddenCount = (showOverview ? 0 : 1) + (showSidebar ? 0 : 1)

	const viewerHeight = resolveViewerHeight(!screens.md, !screens.lg, hiddenCount)

	const toggleFocus = () => {
		// Если скрыт хотя бы один блок — кнопка возвращает обычный режим.
		const shouldFocus = showOverview || showSidebar
		setShowOverview(!shouldFocus)
		setShowSidebar(!shouldFocus)
	}

	return {
		showOverview,
		setShowOverview,
		showSidebar,
		setShowSidebar,
		isViewerFocused,
		viewerHeight,
		toggleFocus,
	}
}
