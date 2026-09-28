export {
	createMask,
	isMaskEmpty,
	paintCircle,
	paintStroke,
	traceOuterContour,
	simplifyContour,
	maskToPolygon,
} from './raster'
export type { BrushMask, Point2D } from './raster'

export { default as BrushCanvasOverlay } from './BrushCanvasOverlay'
export type { BrushCanvasOverlayProps } from './BrushCanvasOverlay'
