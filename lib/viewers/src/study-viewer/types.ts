import type React from 'react'
import type { ViewerImage, ViewerSlotRenderer, ViewerZoomLimits } from '../uzi-viewer/types'
import type {
	ViewerAnnotation,
	ViewerAnnotationApi,
	ViewerAnnotationChange,
	ViewerAnnotationPopupRenderer,
	ViewerAnnotationStyleFn,
} from '../annotations/types'
import type { ViewerToolId } from './tools'

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

/** Размер пикселя снимка, мм. `null` — в файле его нет. */
export interface ViewerPixelSpacing {
	horizontal: number | null
	vertical: number | null
}

/** Контур, который правит кисть*/
export interface ViewerBrushTarget {
	annotationId: string | null
}

export interface ViewerStatus {
	kind: 'loading' | 'error' | 'empty'
	title?: string
	description?: React.ReactNode
}

export interface AnnotatedStudyViewerProps<D = unknown> {
	images: ViewerImage[]
	/** Контуры, которые сейчас на снимке (обычно — текущего кадра).*/
	annotations?: ViewerAnnotation<D>[]
	/** Оформление контура по его данным и состоянию (выделен / под курсором). */
	annotationStyle?: ViewerAnnotationStyleFn<D>
	/** Что врач нарисовал, поправил или удалил. */
	onAnnotationChange?: (change: ViewerAnnotationChange<D>) => void
	/** Данные для только что нарисованного контура (узел, тип сегмента). */
	newAnnotationData?: () => D | undefined
	/**
	 * Доменное разрешение рисовать, сверх режима правки. Например, в цитологии
	 * без выбранного типа сегмента контур некуда сохранить.
	 */
	canDraw?: boolean
	brushTarget?: ViewerBrushTarget
	/** Карточка выделенного контура; вьюер привязывает её к контуру сам. */
	renderAnnotationPopup?: ViewerAnnotationPopupRenderer<D>
	/** Действия над разметкой снаружи — например, досохранить правку перед отправкой. */
	annotationApiRef?: React.Ref<ViewerAnnotationApi>

	tools?: ViewerToolId[]
	activeTool?: ViewerToolId
	onToolChange?: (tool: ViewerToolId) => void

	/** В режиме просмотра панель инструментов скрыта, рисование выключено. */
	readOnly?: boolean
	height?: number | string
	className?: string
	navigationEnabled?: boolean
	onIndexChange?: (index: number) => void

	/** Пределы приближения движка. */
	zoomLimits?: ViewerZoomLimits
	zoomUnit?: 'percent' | 'native'
	status?: ViewerStatus | null
	legendItems?: ViewerLegendItem[]
	legendTitle?: string
	onPxPerMmChange?: (pxPerMm: number | null) => void
	/**Масштаб, сохранённый приложением:*/
	initialPxPerMm?: number | null
	filePixelSpacing?: ViewerPixelSpacing

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
