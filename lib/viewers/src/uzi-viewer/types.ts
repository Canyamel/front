import type React from 'react'
import type OpenSeadragon from 'openseadragon'

/**
 * Инстанс движка 2D-рендера, отдаваемый наружу через `onInstanceReady`.
 *
 * Реэкспортируется отсюда специально: приложения (apps/*) подключают доменные
 * плагины аннотирования к живому вьюеру, но **не должны** сами зависеть от
 * пакета `openseadragon` — движок принадлежит `@medml/viewers`. Если движок
 * когда-нибудь сменится, поменяется только этот алиас.
 */
export type ViewerInstance = OpenSeadragon.Viewer

/**
 * Единица изображения для 2D-вьюера.
 * Полностью доменно-нейтральна: не содержит терминов предметной области
 * (пациенты, диагнозы, конкретные объекты разметки и т.п.).
 */
export interface ViewerImage {
	/** Уникальный идентификатор кадра/страницы. */
	id: string | number
	/** URL изображения (используется, если tileSource не задан явно). */
	url: string
	/** Готовый tileSource для OpenSeadragon (single-image, DZI, IIIF и т.д.). */
	tileSource?: OpenSeadragon.TileSourceOptions | string
	width?: number
	height?: number
	/** Произвольные доменные метаданные — вьюер их не читает, только хранит и прокидывает наружу. */
	metadata?: Record<string, unknown>
}

/** Описание одной кнопки-инструмента в тулбаре (drawing tool, режим и т.п.). */
export interface ViewerToolDefinition {
	id: string
	label?: React.ReactNode
	icon?: React.ReactNode
	disabled?: boolean
}

/** Конфигурация встроенного тулбара. `false` — полностью скрыть тулбар. */
export interface ToolbarConfig {
	showZoom?: boolean
	showFit?: boolean
	showRotate?: boolean
	/**
	 * В чём показывать текущий зум:
	 * - `native` (по умолчанию) — кратность к исходному разрешению
	 *   (×1 = пиксель в пиксель), не зависит от размера изображения;
	 * - `percent` — проценты от «вписанного» изображения (100% = Fit).
	 */
	zoomUnit?: 'percent' | 'native'
	/** Набор доменных инструментов (например, режимов рисования); подписи/иконки задаёт вызывающая сторона. */
	tools?: ViewerToolDefinition[]
}

/** Императивный API вьюера, отдаётся наружу через onViewerReady. */
export interface ViewerApi {
	zoomIn: () => void
	zoomOut: () => void
	fitToScreen: () => void
	rotateLeft: () => void
	rotateRight: () => void
	goToIndex: (index: number) => void
	getOpenSeadragonInstance: () => OpenSeadragon.Viewer | null
}

/** Контекст, доступный слотам расширения (overlaySlot / customToolbarSlot). */
export interface ViewerOverlayContext {
	currentIndex: number
	currentImage: ViewerImage | undefined
	zoom: number
	rotation: number
	osdViewer: OpenSeadragon.Viewer | null
	containerElement: HTMLDivElement | null
}

/** Слот может быть статичным ReactNode либо render-prop функцией с доступом к состоянию вьюера. */
export type ViewerSlotRenderer =
	| React.ReactNode
	| ((context: ViewerOverlayContext) => React.ReactNode)

/**
 * Пределы приближения OpenSeadragon.
 *
 * - `maxZoomLevel` — потолок зума относительно «вписанного» изображения
 *   (10 = 1000%). `null` — потолка нет, ограничивает только `maxZoomPixelRatio`.
 * - `maxZoomPixelRatio` — сколько экранных пикселей максимум приходится
 *   на один пиксель исходного изображения.
 */
export interface ViewerZoomLimits {
	maxZoomLevel?: number | null
	maxZoomPixelRatio?: number
}

export interface UziViewerProps {
	/** Список изображений/страниц. Если больше одного — включается постраничный режим (sequenceMode). */
	images: ViewerImage[]
	/** Контролируемый индекс текущего кадра. */
	currentIndex?: number
	onIndexChange?: (index: number) => void

	/** Текущий активный инструмент — семантику (что означает id) определяет вызывающая сторона. */
	activeTool?: string
	onToolChange?: (toolId: string) => void

	/** Конфигурация встроенного тулбара (zoom/fit/rotate/tools). `false` — скрыть тулбар целиком. */
	toolbarConfig?: ToolbarConfig | false
	/** Показывать ли встроенную навигацию "назад/вперёд" при >1 изображении. */
	navigationEnabled?: boolean

	readOnly?: boolean
	height?: number | string
	className?: string
	/** Контент при пустом списке изображений (нет данных для отображения). */
	emptyState?: React.ReactNode

	onZoomChange?: (zoom: number) => void
	/** Пределы приближения; по умолчанию — 1000% (как для УЗИ). */
	zoomLimits?: ViewerZoomLimits
	onRotationChange?: (rotation: number) => void

	/** Отдаёт императивный API наружу (zoom/rotate/goToIndex/доступ к инстансу OSD). */
	onViewerReady?: (api: ViewerApi) => void
	/**
	 * Вызывается сразу после инициализации внутреннего инстанса OpenSeadragon —
	 * точка расширения для доменных плагинов аннотирования (Annotorious и т.п.),
	 * которым нужен живой viewer instance.
	 */
	onInstanceReady?: (viewer: OpenSeadragon.Viewer, container: HTMLDivElement) => void
	/** Вызывается перед уничтожением инстанса — точка для очистки доменных плагинов. */
	onInstanceWillDestroy?: (viewer: OpenSeadragon.Viewer) => void

	/** Слот для доменных кнопок тулбара (рядом со встроенными zoom/fit/rotate). */
	customToolbarSlot?: ViewerSlotRenderer
	/** Слот для доменных оверлеев поверх холста (легенды, разметка, подсказки). */
	overlaySlot?: ViewerSlotRenderer
}
