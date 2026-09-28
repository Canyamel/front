import OpenSeaDragon from 'openseadragon'
import type { ViewerInstance } from './types'
import type { PlanePoint } from '../geometry'

/**
 * Преобразование координат между снимком и экраном.
 */

export type { PlanePoint }

/** Точка внутри элемента вьюера → координаты пикселя изображения. */
export function elementToImagePoint(viewer: ViewerInstance | null, x: number, y: number): PlanePoint | null {
	if (!viewer?.viewport) return null

	const viewportPoint = viewer.viewport.pointFromPixel(new OpenSeaDragon.Point(x, y))
	const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint)
	return { x: imagePoint.x, y: imagePoint.y }
}

/** Координаты пикселя изображения → точка внутри элемента вьюера. */
export function imageToElementPoint(viewer: ViewerInstance | null, x: number, y: number): PlanePoint | null {
	if (!viewer?.viewport) return null

	const point = viewer.viewport.imageToViewerElementCoordinates(new OpenSeaDragon.Point(x, y))
	return { x: point.x, y: point.y }
}
