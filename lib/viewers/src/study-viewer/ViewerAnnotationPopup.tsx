import React from 'react'
import { imageToElementPoint } from '../uzi-viewer/coords'
import type { ViewerInstance } from '../uzi-viewer/types'
import type { PlanePoint } from '../geometry'

export interface ViewerAnnotationPopupProps {
	viewer: ViewerInstance | null
	/** Точка привязки в координатах снимка (обычно угол разметки). */
	anchor: PlanePoint | null
	/** Отступ от точки привязки, чтобы карточка не накрывала саму разметку. */
	offset?: PlanePoint
	maxWidth?: number
	className?: string
	children?: React.ReactNode
}

const DEFAULT_OFFSET: PlanePoint = { x: 8, y: 0 }

/**
 * Карточка, привязанная к точке на снимке.
 *
 * Позиционирование вынесено из цитологии (`SegmentPopup`): карточка должна
 * ехать вместе со снимком при зуме и панорамировании, а для этого нужен
 * пересчёт координат через инстанс движка — то есть знание о вьюере, которого
 * у приложения быть не должно. Что именно внутри карточки, решает приложение:
 * здесь только якорь и подписка на движение вьюпорта.
 */
const ViewerAnnotationPopup: React.FC<ViewerAnnotationPopupProps> = ({
	viewer,
	anchor,
	offset = DEFAULT_OFFSET,
	maxWidth = 350,
	className,
	children,
}) => {
	// Значение счётчика не нужно — он существует только ради перерисовки:
	// позиция считается на рендере из текущего состояния вьюпорта.
	const [, bumpViewport] = React.useReducer((version: number) => version + 1, 0)

	React.useEffect(() => {
		if (!viewer) return

		viewer.addHandler('update-viewport', bumpViewport)
		viewer.addHandler('resize', bumpViewport)

		return () => {
			viewer.removeHandler('update-viewport', bumpViewport)
			viewer.removeHandler('resize', bumpViewport)
		}
	}, [viewer])

	const position = viewer && anchor ? imageToElementPoint(viewer, anchor.x, anchor.y) : null

	if (!position || !children) return null

	return (
		<div
			className={['medml-viewer-annotation-popup', className].filter(Boolean).join(' ')}
			style={{
				position: 'absolute',
				zIndex: 1010,
				maxWidth,
				left: position.x + offset.x,
				top: position.y + offset.y,
			}}
		>
			{children}
		</div>
	)
}

export default ViewerAnnotationPopup
