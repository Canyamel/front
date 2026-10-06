import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import OpenSeaDragon from 'openseadragon'
import type { ViewerImage, ViewerZoomLimits } from '../types'

export const DEFAULT_ZOOM_LIMITS = { maxZoomLevel: 10, maxZoomPixelRatio: 12 } as const

const DEFAULT_PREFIX_URL = 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/images/'

export interface UseOpenSeadragonOptions {
	images: ViewerImage[]
	/** URL с иконками для нативных контролов OSD (используются только скины/иконки OSD). */
	prefixUrl?: string
	/** Вызывается сразу после того, как инстанс OSD открыл tileSources. */
	onOpen?: (viewer: OpenSeaDragon.Viewer, container: HTMLDivElement) => void
	/** Вызывается непосредственно перед уничтожением инстанса (cleanup эффекта). */
	onBeforeDestroy?: (viewer: OpenSeaDragon.Viewer) => void
	onPageChange?: (index: number) => void
	onZoomChange?: (zoom: number) => void
	zoomLimits?: ViewerZoomLimits
}

export interface UseOpenSeadragonResult {
	containerRef: React.RefObject<HTMLDivElement>
	viewer: OpenSeaDragon.Viewer | null
	currentIndex: number
	zoom: number
	/** Кратность к исходному разрешению (×1 = пиксель в пиксель); null — пока неизвестна. */
	nativeZoom: number | null
	rotation: number
	isReady: boolean
	goToIndex: (index: number) => void
	nextIndex: () => void
	prevIndex: () => void
	zoomIn: () => void
	zoomOut: () => void
	fitToScreen: () => void
	rotateLeft: () => void
	rotateRight: () => void
}

function toTileSources(
	images: ViewerImage[],
): OpenSeaDragon.TileSourceOptions | OpenSeaDragon.TileSourceOptions[] | string {
	const sources = images.map(
		image =>
			image.tileSource ?? {
				type: 'image',
				url: image.url,
				width: image.width,
				height: image.height,
			},
	)

	return (images.length > 1 ? sources : sources[0]) as unknown as
		| OpenSeaDragon.TileSourceOptions
		| OpenSeaDragon.TileSourceOptions[]
}

/** Приводит угол к диапазону [0, 360). */
function normalizeDegrees(degrees: number): number {
	return ((degrees % 360) + 360) % 360
}

/** Зум вьюпорта → экранных пикселей на пиксель текущего изображения. */
function toNativeZoom(osd: OpenSeaDragon.Viewer, viewportZoom: number | undefined): number | null {
	if (viewportZoom == null) return null
	const item = osd.world?.getItemAt(0)
	if (!item) return null
	const value = item.viewportToImageZoom(viewportZoom)
	return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Инкапсулирует "чистое" управление OpenSeadragon: инициализацию/уничтожение
 * инстанса, tileSources, постраничный режим, zoom/pan/rotate/resize.
 * Ничего не знает про аннотации, домены и доменные данные — только жизненный
 * цикл вьювера и его базовые команды.
 */
export function useOpenSeadragon(options: UseOpenSeadragonOptions): UseOpenSeadragonResult {
	const {
		images,
		prefixUrl = DEFAULT_PREFIX_URL,
		onOpen,
		onBeforeDestroy,
		onPageChange,
		onZoomChange,
		zoomLimits,
	} = options

	const maxZoomLevel =
		zoomLimits?.maxZoomLevel === undefined ? DEFAULT_ZOOM_LIMITS.maxZoomLevel : zoomLimits.maxZoomLevel
	const maxZoomPixelRatio = zoomLimits?.maxZoomPixelRatio ?? DEFAULT_ZOOM_LIMITS.maxZoomPixelRatio

	const containerRef = useRef<HTMLDivElement>(null)
	const viewerRef = useRef<OpenSeaDragon.Viewer | null>(null)

	const [viewer, setViewer] = useState<OpenSeaDragon.Viewer | null>(null)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [zoom, setZoom] = useState(1)
	const [nativeZoom, setNativeZoom] = useState<number | null>(null)
	const [rotation, setRotation] = useState(0)
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		if (!containerRef.current || images.length === 0) {
			return
		}

		if (viewerRef.current) {
			try {
				viewerRef.current.destroy()
			} catch (err) {
				console.warn('useOpenSeadragon: error destroying previous instance', err)
			}
			viewerRef.current = null
		}

		let cancelled = false

		try {
			const osd = OpenSeaDragon({
				element: containerRef.current,
				prefixUrl,
				tileSources: toTileSources(images) as any,
				sequenceMode: images.length > 1,
				showNavigator: false,
				showFullPageControl: false,
				showHomeControl: false,
				showZoomControl: false,
				nextButton: 'none',
				previousButton: 'none',
				animationTime: 0.2,
				blendTime: 0.1,
				constrainDuringPan: false,
				visibilityRatio: 0.1,
				minZoomImageRatio: 0.5,
				maxZoomPixelRatio,
				...(maxZoomLevel == null ? {} : { maxZoomLevel }),
				zoomPerClick: 1.6,
				zoomPerScroll: 1.2,
				gestureSettingsMouse: {
					scrollToZoom: true,
					clickToZoom: false,
					dblClickToZoom: true,
					dragToPan: true,
				},
			})

			viewerRef.current = osd
			setRotation(0)
			setIsReady(false)

			osd.addHandler('open', () => {
				if (cancelled) return
				const openedIndex = osd.currentPage?.() ?? 0
				setIsReady(true)
				setCurrentIndex(openedIndex)
				setZoom(1)
				setNativeZoom(toNativeZoom(osd, osd.viewport?.getZoom()))
				setViewer(osd)
				onPageChange?.(openedIndex)
				if (containerRef.current) {
					onOpen?.(osd, containerRef.current)
				}
			})

			osd.addHandler('zoom', (event: any) => {
				const homeZoom = osd.viewport?.getHomeZoom() || 1
				const level = event.zoom / homeZoom
				setZoom(level)
				setNativeZoom(toNativeZoom(osd, event.zoom))
				onZoomChange?.(level)
			})

			osd.addHandler('page', (data: any) => {
				setCurrentIndex(data.page)
				onPageChange?.(data.page)
			})

			osd.addHandler('rotate', (event: any) => {
				setRotation(normalizeDegrees(event.degrees))
			})

			return () => {
				cancelled = true
				setIsReady(false)
				setViewer(null)
				try {
					onBeforeDestroy?.(osd)
				} catch (err) {
					console.warn('useOpenSeadragon: onBeforeDestroy handler failed', err)
				}
				try {
					osd.destroy()
				} catch (err) {
					console.warn('useOpenSeadragon: error destroying instance', err)
				}
				if (viewerRef.current === osd) {
					viewerRef.current = null
				}
			}
		} catch (error) {
			console.error('useOpenSeadragon: failed to initialize OpenSeadragon', error)
			return
		}
	}, [images, prefixUrl, maxZoomLevel, maxZoomPixelRatio])

	const goToIndex = useCallback(
		(index: number) => {
			const total = images.length
			if (!viewerRef.current || total === 0) return
			const target = ((index % total) + total) % total
			viewerRef.current.goToPage(target)
		},
		[images.length],
	)

	const nextIndex = useCallback(() => goToIndex(currentIndex + 1), [currentIndex, goToIndex])
	const prevIndex = useCallback(() => goToIndex(currentIndex - 1), [currentIndex, goToIndex])

	const zoomIn = useCallback(() => {
		const osd = viewerRef.current
		if (!osd?.viewport) return
		const center = osd.viewport.getCenter()
		osd.viewport.zoomBy(1.4, center)
		osd.viewport.applyConstraints()
	}, [])

	const zoomOut = useCallback(() => {
		const osd = viewerRef.current
		if (!osd?.viewport) return
		const center = osd.viewport.getCenter()
		osd.viewport.zoomBy(0.75, center)
		osd.viewport.applyConstraints()
	}, [])

	/**
	 * Поворот всегда в пределах одного оборота (0–359°).
	 *
	 * Иначе угол копится: 360°, 450°, −270°… Слой разметки Annotorious
	 * переводит угол в радианы и поправляет его ровно один раз
	 * (`a < 0 → +2π`, `a > 2π → −2π`), поэтому за пределами одного оборота
	 * он остаётся вне диапазона, и контуры уезжают за видимую область —
	 * выглядит как «сегменты пропали после нескольких поворотов».
	 */
	const rotateBy = useCallback((delta: number) => {
		const osd = viewerRef.current
		if (!osd?.viewport) return
		const next = normalizeDegrees(osd.viewport.getRotation() + delta)
		osd.viewport.setRotation(next)
		setRotation(next)
	}, [])

	const fitToScreen = useCallback(() => {
		const osd = viewerRef.current
		if (!osd?.viewport) return
		osd.viewport.fitBounds(osd.viewport.getHomeBounds())
	}, [])

	const rotateLeft = useCallback(() => {
		rotateBy(-90)
	}, [rotateBy])

	const rotateRight = useCallback(() => {
		rotateBy(90)
	}, [rotateBy])

	return {
		containerRef,
		viewer,
		currentIndex,
		zoom,
		nativeZoom,
		rotation,
		isReady,
		goToIndex,
		nextIndex,
		prevIndex,
		zoomIn,
		zoomOut,
		fitToScreen,
		rotateLeft,
		rotateRight,
	}
}
