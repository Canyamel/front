import type React from 'react'
import type { PlanePoint } from '../geometry'
import type { ViewerImage, ViewerInstance, ViewerSlotRenderer, ViewerZoomLimits } from '../uzi-viewer/types'
import type { ViewerToolId } from './tools'

export interface ViewerAnnotationLayer {
	/**
	 * Подключить слой к живому инстансу движка. Вызывается из
	 * `onInstanceReady` вьюера, то есть после того как OSD открыл снимок.
	 */
	attach: (viewer: ViewerInstance, container: HTMLDivElement) => void
	/** Отключить слой перед уничтожением инстанса движка. */
	detach: () => void
	/**
	 * Включить инструмент рисования.
	 *
	 * `enabled` — разрешение со стороны вьюера: в режиме просмотра, на
	 * навигации и на инструментах вьюера (кисть/линейка) слой разметки должен
	 * отдать управление, иначе он забирает перетаскивание себе.
	 *
	 * Это разрешение, а не команда: доменные условия знает только слой, и он
	 * вправе рисование не включать. Например, в цитологии контур некуда
	 * сохранять, пока врач не выбрал группу сегментов.
	 */
	setTool: (tool: ViewerToolId, enabled: boolean) => void
	/**
	 * Добавить готовый контур, полученный не от библиотеки разметки
	 * (кисть-заполнение). Точки — в координатах снимка.
	 *
	 * Возвращает `false`, если контур вырожденный, слой недоступен или его
	 * доменные условия не позволяют сохранить контур. По `false` вьюер оставит
	 * набросок на месте и скажет врачу, что контур не сохранён.
	 */
	addPolygon?: (points: PlanePoint[]) => boolean
}

/** Строка легенды поверх снимка: цвет разметки и её подпись. */
export interface ViewerLegendItem {
	id: string | number
	color: string
	title: string
	subtitle?: string | null
	badge?: string | null
	section?: string
	/** Объекта нет на текущем кадре — строка приглушена. */
	muted?: boolean
	/** Подсказка при наведении на строку. */
	hint?: string
	/** Пунктирный значок — для вспомогательных контуров (например, долей ЩЖ). */
	dashed?: boolean
}

export interface ViewerStatus {
	kind: 'loading' | 'error' | 'empty'
	title?: string
	description?: React.ReactNode
}

export interface AnnotatedStudyViewerProps {
	images: ViewerImage[]
	annotationLayer?: ViewerAnnotationLayer

	tools?: ViewerToolId[]
	activeTool?: ViewerToolId
	onToolChange?: (tool: ViewerToolId) => void

	/** В режиме просмотра панель инструментов скрыта, рисование выключено. */
	readOnly?: boolean
	height?: number | string
	className?: string
	navigationEnabled?: boolean
	onIndexChange?: (index: number) => void

	/** Пределы приближения движка; по умолчанию — как у `UziViewer`. */
	zoomLimits?: ViewerZoomLimits
	zoomUnit?: 'percent' | 'native'

	/** Состояние вместо снимка: загрузка/ошибка/нет данных. */
	status?: ViewerStatus | null

	/** Легенда разметки поверх снимка. */
	legendItems?: ViewerLegendItem[]
	legendTitle?: string
	/**
	 * Габариты объектов в легенде считаются в мм, поэтому легенде нужен
	 * масштаб. Вьюер передаёт его обратно: `subtitle` строит приложение.
	 */
	onPxPerMmChange?: (pxPerMm: number | null) => void

	annotationsVisible?: boolean
	onAnnotationsVisibleChange?: (visible: boolean) => void
	annotationsToggleLabel?: string

	/** Доменные оверлеи поверх холста (карточки объектов, подсказки). */
	overlaySlot?: ViewerSlotRenderer
	/** Доменные кнопки рядом со встроенными zoom/fit/rotate. */
	customToolbarSlot?: ViewerSlotRenderer
	/** Панель над снимком между тулбаром и холстом (выбор группы и т.п.). */
	toolPanelExtra?: React.ReactNode
}
