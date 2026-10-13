import { useEffect, useRef, useState } from 'react'

import type { ViewerAnnotation, ViewerAnnotationStyleFn } from '../annotations'
import type { ViewerInstance } from '../uzi-viewer/types'
import { renderAnnotatedSnapshot } from './snapshot'

export interface ViewerSnapshotSaveTargetProps<D> {
	viewer: ViewerInstance | null
	imageUrl: string | undefined
	annotations: ViewerAnnotation<D>[]
	style?: ViewerAnnotationStyleFn<D>
}

const RENDER_DELAY_MS = 300

/**
 * «Сохранить картинку как» по правому клику сохраняет кадр вместе с
 * разметкой, а не только верхний холст Annotorious с контурами.
 *
 * Заранее сводим кадр и видимые контуры в PNG.
 * На нажатие правой кнопки над снимком подкладываем поверх него прозрачную
 * `<img>` с этой картинкой — контекстное меню браузера открывается уже на
 * ней, и «Сохранить картинку как» сохраняет сведённый кадр. Следующее
 * движение мыши убирает подложку, обычной работе со снимком она не мешает.
 */
function ViewerSnapshotSaveTarget<D>({ viewer, imageUrl, annotations, style }: ViewerSnapshotSaveTargetProps<D>) {
	const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null)
	const imgRef = useRef<HTMLImageElement>(null)

	useEffect(() => {
		if (!imageUrl) return

		let cancelled = false
		let objectUrl: string | null = null

		const timer = window.setTimeout(() => {
			renderAnnotatedSnapshot(imageUrl, annotations, style)
				.then(blob => {
					if (cancelled || !blob) return
					objectUrl = URL.createObjectURL(blob)
					setSnapshotUrl(objectUrl)
				})
				.catch(error => console.warn('Не удалось свести кадр с разметкой:', error))
		}, RENDER_DELAY_MS)

		return () => {
			cancelled = true
			window.clearTimeout(timer)
			setSnapshotUrl(null)
			if (objectUrl) URL.revokeObjectURL(objectUrl)
		}
	}, [imageUrl, annotations, style])

	useEffect(() => {
		const element = viewer?.element
		const img = imgRef.current
		if (!element || !img || !snapshotUrl) return

		let menuShown = false
		const show = () => {
			img.style.display = 'block'
			menuShown = false
		}
		const hide = () => {
			img.style.display = 'none'
			menuShown = false
		}

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null
			const overSnapshot = target === img || (target != null && element.contains(target))
			if (event.button === 2 && overSnapshot) show()
			else if (menuShown) hide()
		}
		const onContextMenu = () => {
			menuShown = true
		}
		const onPointerMove = () => {
			if (menuShown) hide()
		}

		window.addEventListener('pointerdown', onPointerDown, true)
		window.addEventListener('contextmenu', onContextMenu, true)
		window.addEventListener('pointermove', onPointerMove, true)
		window.addEventListener('wheel', hide, true)
		window.addEventListener('keydown', hide, true)

		return () => {
			hide()
			window.removeEventListener('pointerdown', onPointerDown, true)
			window.removeEventListener('contextmenu', onContextMenu, true)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('wheel', hide, true)
			window.removeEventListener('keydown', hide, true)
		}
	}, [viewer, snapshotUrl])

	if (!snapshotUrl) return null

	return (
		<img
			ref={imgRef}
			src={snapshotUrl}
			alt='Кадр снимка с разметкой'
			draggable={false}
			style={{
				display: 'none',
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				opacity: 0,
				zIndex: 5,
			}}
		/>
	)
}

export default ViewerSnapshotSaveTarget
