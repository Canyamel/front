import type { ViewerAnnotation, ViewerAnnotationStyleFn } from '../annotations'

/**
 * Кадр снимка с разметкой одной картинкой — в исходном разрешении кадра,
 * независимо от зума и поворота на экране.
 */
export async function renderAnnotatedSnapshot<D>(
	imageUrl: string,
	annotations: ViewerAnnotation<D>[],
	style?: ViewerAnnotationStyleFn<D>,
): Promise<Blob | null> {
	const image = await loadImage(imageUrl)
	if (!image) return null

	const width = image.naturalWidth
	const height = image.naturalHeight
	if (!width || !height) return null

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) return null

	ctx.drawImage(image, 0, 0)

	// Толщина линии на экране задана в экранных пикселях. На большом кадре
	// без поправки контур в файле получился бы еле заметным.
	const lineScale = Math.max(1, Math.max(width, height) / 1000)

	for (const annotation of annotations) {
		if (annotation.points.length < 3) continue
		const look = style?.(annotation, { selected: false, hovered: false }) ?? {}

		ctx.beginPath()
		annotation.points.forEach((point, index) => {
			if (index === 0) ctx.moveTo(point.x, point.y)
			else ctx.lineTo(point.x, point.y)
		})
		ctx.closePath()

		if (look.fill) {
			ctx.globalAlpha = look.fillOpacity ?? 1
			ctx.fillStyle = look.fill
			ctx.fill()
		}
		ctx.globalAlpha = look.strokeOpacity ?? 1
		ctx.strokeStyle = look.stroke ?? DEFAULT_STROKE
		ctx.lineWidth = (look.strokeWidth ?? 2) * lineScale
		ctx.lineJoin = 'round'
		ctx.stroke()
		ctx.globalAlpha = 1
	}

	try {
		return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
	} catch {
		return null
	}
}

const DEFAULT_STROKE = '#ff0000'

function loadImage(url: string): Promise<HTMLImageElement | null> {
	return new Promise(resolve => {
		const image = new Image()
		// Кадр с другого origin можно свести, только если он отдан с CORS;
		// со своего origin атрибут не нужен.
		if (isCrossOrigin(url)) image.crossOrigin = 'anonymous'
		image.onload = () => resolve(image)
		image.onerror = () => resolve(null)
		image.src = url
	})
}

function isCrossOrigin(url: string): boolean {
	try {
		return new URL(url, window.location.href).origin !== window.location.origin
	} catch {
		return false
	}
}
