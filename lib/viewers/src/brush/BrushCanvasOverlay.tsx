import React from 'react'
import { elementToImagePoint, imageToElementPoint } from '../uzi-viewer/coords'
import type { ViewerInstance } from '../uzi-viewer/types'
import type { PlanePoint } from '../geometry'
import { isMaskEmpty, paintStroke, strokeBoundsInMask, type BrushMask, type MaskRect } from './raster'

export interface BrushCanvasOverlayProps {
	/** Живой инстанс OSD — нужен для перевода экранных координат в координаты снимка. */
	viewer: ViewerInstance | null
	mask: BrushMask | null
	/** Радиус кисти в пикселях изображения. */
	radius: number
	/** `true` — ластик (стирает), `false` — кисть (рисует). */
	erasing: boolean
	/** Цвет наброска. */
	color?: string
	/** Штрих завершён — снаружи обновляется превью/состояние. */
	onStrokeEnd?: () => void
}

/** Готовый растр наброска: канвас размером маски, к которой он привязан. */
interface MaskLayer {
	mask: BrushMask
	canvas: HTMLCanvasElement
	ctx: CanvasRenderingContext2D
	color: string
}

/**
 * Слой наброска кистью поверх снимка.
 *
 * Маска хранится в координатах изображения, а канвас рисуется в координатах
 * экрана — поэтому при зуме и панорамировании он перерисовывается по событиям
 * OSD, а не пересчитывает саму маску. Так набросок не «плывёт» и не теряет
 * точность при масштабировании.
 *
 * Растр наброска держится готовым во внеэкранном канвасе и обновляется только
 * в задетой штрихом области. Пересобирать его целиком нельзя: маска бывает в
 * миллионы пикселей (whole-slide снимки цитологии), а перерисовка случается на
 * каждое движение мыши и на каждый кадр анимации вьюпорта.
 */
const BrushCanvasOverlay: React.FC<BrushCanvasOverlayProps> = ({
	viewer,
	mask,
	radius,
	erasing,
	color = 'rgba(6, 182, 212, 0.4)',
	onStrokeEnd,
}) => {
	const canvasRef = React.useRef<HTMLCanvasElement>(null)
	const layerRef = React.useRef<MaskLayer | null>(null)
	const drawingRef = React.useRef(false)
	const lastPointRef = React.useRef<PlanePoint | null>(null)

	/** Экранная точка → координаты пикселя изображения. */
	const toImagePoint = React.useCallback(
		(clientX: number, clientY: number): PlanePoint | null => {
			const canvas = canvasRef.current
			if (!viewer || !canvas) return null

			const rect = canvas.getBoundingClientRect()
			return elementToImagePoint(viewer, clientX - rect.left, clientY - rect.top)
		},
		[viewer],
	)

	/**
	 * Внеэкранный растр под текущую маску. Пересоздаётся только когда меняется
	 * сама маска (смена кадра, очистка наброска) или цвет.
	 */
	const ensureLayer = React.useCallback(
		(currentMask: BrushMask): MaskLayer | null => {
			const existing = layerRef.current
			if (existing && existing.mask === currentMask && existing.color === color) {
				return existing
			}

			if (currentMask.width === 0 || currentMask.height === 0) {
				layerRef.current = null
				return null
			}

			const canvas = document.createElement('canvas')
			canvas.width = currentMask.width
			canvas.height = currentMask.height
			const ctx = canvas.getContext('2d')
			if (!ctx) {
				layerRef.current = null
				return null
			}

			const layer: MaskLayer = { mask: currentMask, canvas, ctx, color }
			layerRef.current = layer

			// Свежий канвас прозрачный, а новую маску создают пустой (под кадр
			// или по кнопке «Очистить») — переносить нечего. Полный перенос нужен
			// только если маска уже закрашена: например, сменился цвет наброска.
			// `isMaskEmpty` выходит на первом закрашенном пикселе, так что
			// лишнего прохода по миллионам пикселей здесь нет.
			if (!isMaskEmpty(currentMask)) {
				paintRegion(layer, {
					x: 0,
					y: 0,
					width: currentMask.width,
					height: currentMask.height,
				})
			}

			return layer
		},
		[color],
	)

	/** Перерисовка маски в текущем положении вьюпорта. */
	const redraw = React.useCallback(() => {
		const canvas = canvasRef.current
		const currentMask = mask
		if (!canvas || !viewer || !currentMask) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const rect = canvas.getBoundingClientRect()
		if (canvas.width !== rect.width || canvas.height !== rect.height) {
			canvas.width = rect.width
			canvas.height = rect.height
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height)

		const layer = ensureLayer(currentMask)
		if (!layer) return

		// Границы изображения в координатах экрана. Берём размеры снимка, а не
		// растра маски: на больших снимках растр мельче (см. `createMask`), и
		// по его размерам маска легла бы в угол изображения.
		const topLeft = imageToElementPoint(viewer, 0, 0)
		const bottomRight = imageToElementPoint(
			viewer,
			currentMask.imageWidth,
			currentMask.imageHeight,
		)
		if (!topLeft || !bottomRight) return

		// Растр маски натягивается на снимок; при scale < 1 сглаживание только
		// размыло бы границу мазка.
		ctx.imageSmoothingEnabled = false
		ctx.drawImage(
			layer.canvas,
			topLeft.x,
			topLeft.y,
			bottomRight.x - topLeft.x,
			bottomRight.y - topLeft.y,
		)
	}, [viewer, mask, ensureLayer])

	// Перерисовка при движении вьюпорта.
	React.useEffect(() => {
		if (!viewer) return

		const handler = () => redraw()
		viewer.addHandler('animation', handler)
		viewer.addHandler('resize', handler)
		viewer.addHandler('open', handler)
		redraw()

		return () => {
			viewer.removeHandler('animation', handler)
			viewer.removeHandler('resize', handler)
			viewer.removeHandler('open', handler)
		}
	}, [viewer, redraw])

	/** Штрих по маске + обновление только задетого куска растра. */
	const applyStroke = React.useCallback(
		(from: PlanePoint, to: PlanePoint) => {
			const currentMask = mask
			if (!currentMask) return

			paintStroke(currentMask, from, to, radius, erasing ? 0 : 1)

			const layer = ensureLayer(currentMask)
			const dirty = strokeBoundsInMask(currentMask, from, to, radius)
			if (layer && dirty) {
				paintRegion(layer, dirty)
			}

			redraw()
		},
		[mask, radius, erasing, ensureLayer, redraw],
	)

	const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!mask) return
		event.currentTarget.setPointerCapture(event.pointerId)
		drawingRef.current = true

		const point = toImagePoint(event.clientX, event.clientY)
		if (point) {
			applyStroke(point, point)
			lastPointRef.current = point
		}
	}

	const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!drawingRef.current || !mask) return

		const point = toImagePoint(event.clientX, event.clientY)
		if (!point) return

		applyStroke(lastPointRef.current ?? point, point)
		lastPointRef.current = point
	}

	const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!drawingRef.current) return
		drawingRef.current = false
		lastPointRef.current = null
		try {
			event.currentTarget.releasePointerCapture(event.pointerId)
		} catch {
			/* указатель мог быть уже отпущен */
		}
		onStrokeEnd?.()
	}

	return (
		<canvas
			ref={canvasRef}
			className='medml-viewer-brush-layer'
			style={{
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				zIndex: 900,
				cursor: erasing ? 'cell' : 'crosshair',
				touchAction: 'none',
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endStroke}
			onPointerCancel={endStroke}
		/>
	)
}

/**
 * Переносит кусок маски в растр наброска.
 *
 * `putImageData` затирает область целиком, поэтому стёртые ластиком пиксели
 * гасятся тем же вызовом — отдельная очистка не нужна.
 */
function paintRegion(layer: MaskLayer, rect: MaskRect): void {
	const { mask, ctx } = layer
	const imageData = ctx.createImageData(rect.width, rect.height)
	const rgba = parseColor(layer.color)

	for (let y = 0; y < rect.height; y++) {
		const maskRow = (rect.y + y) * mask.width
		const dataRow = y * rect.width

		for (let x = 0; x < rect.width; x++) {
			if (mask.data[maskRow + rect.x + x] !== 1) continue

			const o = (dataRow + x) * 4
			imageData.data[o] = rgba.r
			imageData.data[o + 1] = rgba.g
			imageData.data[o + 2] = rgba.b
			imageData.data[o + 3] = rgba.a
		}
	}

	ctx.putImageData(imageData, rect.x, rect.y)
}

/** `rgba(r, g, b, a)` или `#rrggbb` → компоненты 0..255. */
function parseColor(value: string): { r: number; g: number; b: number; a: number } {
	const rgba = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(value)
	if (rgba) {
		return {
			r: Number(rgba[1]),
			g: Number(rgba[2]),
			b: Number(rgba[3]),
			a: Math.round((rgba[4] ? Number(rgba[4]) : 1) * 255),
		}
	}

	const hex = /^#([\da-f]{6})$/i.exec(value.trim())
	if (hex) {
		const int = Number.parseInt(hex[1], 16)
		return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: 102 }
	}

	return { r: 6, g: 182, b: 212, a: 102 }
}

export default BrushCanvasOverlay
