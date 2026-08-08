import { useEffect, useMemo, useState } from 'react'
import { isTiffUrl, getImageDimensions, isDicomUrl } from '@medml/shared'
import { prepareTiffImageArray } from './tiffSlides'
import type { ImageTile } from './types'

/**
 * Для TIFF/DICOM бэкенд отдаёт PNG-нарезку рядом со снимком (`<dir>/pngs`).
 * Если `slide_template` не пришёл — восстанавливаем его из URL исходника.
 */
function deriveTiffSlideTemplate(link1: string): [string, string, string] | null {
	try {
		const imageUrl = new URL(
			link1,
			typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
		)
		const pngBase = imageUrl.pathname.replace(/\/[^/]+$/, '') + '/pngs'
		return [`${imageUrl.origin}${pngBase}`, 'slide_', '.png']
	} catch {
		return null
	}
}

/** Результат подготовки, привязанный к конкретному снимку (`key`). */
interface PreparedImage {
	key: string
	tiles: ImageTile[]
	dimensions: { width: number; height: number } | null
}

export interface UseGalleryImageSourceOptions {
	link1: string | null
	image_count: number
	slide_template?: string[]
	slide_urls?: string[]
}

export interface UseGalleryImageSourceResult {
	isLoading: boolean
	/** Готовый источник для вьюера: массив кадров (TIFF/DICOM) либо один снимок. */
	imageSource: ImageTile | ImageTile[]
}

/**
 * Приводит разнородные варианты снимка (одиночный PNG, постраничная нарезка
 * TIFF/DICOM) к единому источнику для `<ThyroidAnnotatedViewer />`.
 *
 * Вынесено из `Gallery`, где загрузка размеров, подготовка кадров и разметка
 * жили в одном компоненте. Состояние пишется только из async-колбэка и
 * помечается ключом снимка, поэтому «готовность» выводится при рендере —
 * без синхронных setState внутри эффекта.
 */
export function useGalleryImageSource({
	link1,
	image_count,
	slide_template,
	slide_urls,
}: UseGalleryImageSourceOptions): UseGalleryImageSourceResult {
	const [prepared, setPrepared] = useState<PreparedImage | null>(null)

	const usesGeneratedSlides = link1 ? isTiffUrl(link1) || isDicomUrl(link1) : false

	// Стабилизируем список URL-ов, чтобы новый литерал массива на каждый
	// рендер родителя не перезапускал подготовку снимка.
	const slideUrlsKey = (slide_urls ?? []).join('|')
	const slideTemplateKey = (slide_template ?? []).join('|')

	useEffect(() => {
		if (!link1) return

		let cancelled = false

		const prepareImage = async () => {
			try {
				if (usesGeneratedSlides) {
					const tiles = prepareTiffImageArray({
						slide_urls: slideUrlsKey ? slideUrlsKey.split('|') : [],
						slide_template:
							slide_template ?? deriveTiffSlideTemplate(link1) ?? undefined,
						image_count: image_count || 1,
					})
					if (!cancelled) {
						setPrepared({ key: link1, tiles, dimensions: null })
					}
					return
				}

				const dimensions = await getImageDimensions(link1)
				if (!cancelled) {
					setPrepared({ key: link1, tiles: [], dimensions })
				}
			} catch (err) {
				console.error('Error preparing image:', err)
				if (!cancelled) {
					setPrepared({ key: link1, tiles: [], dimensions: null })
				}
			}
		}

		void prepareImage()

		return () => {
			cancelled = true
		}
	}, [
		link1,
		image_count,
		slideTemplateKey,
		slideUrlsKey,
		slide_template,
		usesGeneratedSlides,
	])

	const isReady = !link1 || prepared?.key === link1

	const imageSource = useMemo<ImageTile | ImageTile[]>(() => {
		if (usesGeneratedSlides) {
			return isReady ? (prepared?.tiles ?? []) : []
		}

		const dimensions = isReady ? prepared?.dimensions : null
		return {
			type: 'image',
			url: link1 ?? '',
			...(dimensions
				? { width: dimensions.width, height: dimensions.height }
				: {}),
		}
	}, [isReady, link1, prepared, usesGeneratedSlides])

	return { isLoading: !isReady, imageSource }
}
