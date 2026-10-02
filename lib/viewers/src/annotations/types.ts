import type React from 'react'
import type { PlanePoint } from '../geometry'
import type { ViewerInstance } from '../uzi-viewer/types'

/**
 * Контур на снимке в том виде, в каком его видит приложение.
 *
 * Приложение отдаёт вьюеру список контуров текущего кадра, а библиотеку
 * разметки (Annotorious 3) вьюер держит у себя. `data` — доменные данные
 * контура (узел, тип сегмента, цвет…), вьюер их не читает, только
 * возвращает в стиль, карточку и события.
 */
export interface ViewerAnnotation<D = unknown> {
	/** Уникален в пределах набора: на разных кадрах — разные id. */
	id: string
	/** Вершины полигона в координатах снимка. */
	points: PlanePoint[]
	data?: D
	/**
	 * `false` — контур можно только выделить (карточка), но не править даже
	 * в режиме редактирования. По умолчанию правится.
	 */
	editable?: boolean
}

/** Что врач сделал с контуром. Набор событий одинаков для всех приложений. */
export type ViewerAnnotationChange<D = unknown> =
	| { type: 'create'; annotation: ViewerAnnotation<D> }
	| { type: 'update'; annotation: ViewerAnnotation<D> }
	| { type: 'delete'; annotation: ViewerAnnotation<D> }

/**
 * Оформление контура. Невыделенные контуры Annotorious 3 рисует через WebGL,
 * CSS на них не действует — всё задаётся здесь. Цвет — `#RRGGBB` или
 * `#RRGGBBAA` (прозрачность в цвете Annotorious 3.0 понимает надёжнее,
 * чем `fillOpacity`).
 */
export interface ViewerAnnotationStyle {
	stroke?: string
	strokeWidth?: number
	strokeOpacity?: number
	fill?: string
	fillOpacity?: number
}

export interface ViewerAnnotationStyleState {
	selected: boolean
	hovered: boolean
}

export type ViewerAnnotationStyleFn<D = unknown> = (
	annotation: ViewerAnnotation<D>,
	state: ViewerAnnotationStyleState,
) => ViewerAnnotationStyle | undefined

/** Всё, что нужно карточке выделенного контура. */
export interface ViewerAnnotationPopupContext<D = unknown> {
	annotation: ViewerAnnotation<D>
	/** Режим просмотра: карточка только информирует. */
	readOnly: boolean
	/** Удалить контур — придёт обычное событие `delete`. */
	remove: () => void
	/** Масштаб снимка; `null`, пока не задан. */
	pxPerMm: number | null
}

/** Императивные действия над разметкой, которые нужны снаружи. */
export interface ViewerAnnotationApi {
	/**
	 * Досохранить правку выделенного контура. Annotorious 3 сообщает о правке,
	 * только когда с контура снимают выделение, — перед отправкой на сервер
	 * выделение нужно снять и дождаться события.
	 */
	commitSelection: () => Promise<void>
}

/** Подключение слоя разметки к живому инстансу движка — внутреннее для вьюера. */
export interface ViewerAnnotationLayer {
	attach: (viewer: ViewerInstance) => void
	detach: () => void
}

export type ViewerAnnotationPopupRenderer<D = unknown> = (context: ViewerAnnotationPopupContext<D>) => React.ReactNode
