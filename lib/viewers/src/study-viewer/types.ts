import type React from 'react'
import type { PlanePoint } from '../geometry'
import type { ViewerImage, ViewerInstance, ViewerSlotRenderer } from '../uzi-viewer/types'
import type { ViewerToolId } from './tools'

/**
 * Контракт слоя разметки.
 *
 * Ключевая точка унификации: УЗИ и цитология используют разные версии
 * Annotorious (2 от `@recogito` и 3 от `@annotorious`) с несовместимыми API —
 * разные форматы аннотаций, разные события, разные способы задать стиль.
 * Общий вьюер про это знать не должен, поэтому приложение отдаёт ему объект
 * с четырьмя методами, а всё остальное (инструменты, линейка, кисть, легенда,
 * состояния загрузки) живёт в `@medml/viewers` в одном экземпляре.
 *
 * Благодаря контракту переезд УЗИ на Annotorious 3 — это замена одного
 * адаптера в приложении, без правок вьюера.
 */
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
	/** Цвет контура — тот же, которым объект нарисован на снимке. */
	color: string
	title: string
	/** Вторая строка мелким шрифтом (например, габариты в мм). */
	subtitle?: string | null
	/** Значок справа (тип, класс, вероятность). */
	badge?: string | null
}

/** Что показать вместо снимка: загрузка, ошибка, пустой результат. */
export interface ViewerStatus {
	kind: 'loading' | 'error' | 'empty'
	title?: string
	description?: React.ReactNode
}

export interface AnnotatedStudyViewerProps {
	/** Кадры снимка. Больше одного — включается постраничный режим. */
	images: ViewerImage[]
	/** Слой разметки приложения; без него вьюер работает как просмотрщик. */
	annotationLayer?: ViewerAnnotationLayer

	/** Какие инструменты доступны врачу. По умолчанию — все. */
	tools?: ViewerToolId[]
	/** Контролируемый активный инструмент (если приложению нужно его знать). */
	activeTool?: ViewerToolId
	onToolChange?: (tool: ViewerToolId) => void

	/** В режиме просмотра панель инструментов скрыта, рисование выключено. */
	readOnly?: boolean
	height?: number | string
	className?: string
	navigationEnabled?: boolean
	onIndexChange?: (index: number) => void

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

	/**
	 * Переключатель видимости разметки в тулбаре. Если не задан — кнопки нет
	 * (скрывать нечего).
	 */
	annotationsVisible?: boolean
	onAnnotationsVisibleChange?: (visible: boolean) => void

	/** Доменные оверлеи поверх холста (карточки объектов, подсказки). */
	overlaySlot?: ViewerSlotRenderer
	/** Доменные кнопки рядом со встроенными zoom/fit/rotate. */
	customToolbarSlot?: ViewerSlotRenderer
	/** Панель над снимком между тулбаром и холстом (выбор группы и т.п.). */
	toolPanelExtra?: React.ReactNode
}
