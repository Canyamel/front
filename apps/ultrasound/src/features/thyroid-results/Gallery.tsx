import { useCallback, useEffect, useMemo, useState } from 'react'
import { Spin } from 'antd'
import OpenSeadragonViewer from './OpenSeadragonViewer'
import {
	isTiffUrl,
	getImageDimensions,
	isDicomUrl,
} from '@/features/thyroid-results/imageUtils'
import type {
	Segment,
	SegmentDraftChange,
} from '@/features/thyroid-results/thyroidResultsTypes'
import GalleryToolbar from './GalleryToolbar'
import NoImageState from './NoImageState'
import { prepareTiffImageArray } from './TiffImagePreparer'
import type {
	GalleryProps,
	ImageTile,
} from '@/features/thyroid-results/viewerTypes'
import { loadThyroidStructures } from '@/lib/structuresStorage'
import type { ThyroidStructureJson } from './demoThyroidStructures'

const deriveTiffSlideTemplate = (
	link1: string,
): [string, string, string] | null => {
	try {
		const imageUrl = new URL(
			link1,
			typeof window !== 'undefined'
				? window.location.origin
				: 'http://localhost',
		)
		const pngBase = imageUrl.pathname.replace(/\/[^/]+$/, '') + '/pngs'
		return [`${imageUrl.origin}${pngBase}`, 'slide_', '.png']
	} catch {
		return null
	}
}

const Gallery = ({
	url,
	link1,
	seg,
	imageid,
	image_count,
	slide_template,
	slide_urls = [],
	isEditMode = false,
	currentGroup,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	isSaving = false,
	hasUnsavedChanges = false,
	onDraftChangesChange,
	viewerResetKey = 0,
	viewerHeight = 600,
	thyroidStructures,
}: GalleryProps) => {
	const [imgArray, setImgArray] = useState<ImageTile[]>([])
	const [imageDimensions, setImageDimensions] = useState<{
		width: number
		height: number
	} | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [selectedGroup, setSelectedGroup] = useState<
		string | number | undefined
	>(currentGroup ?? seg[0]?.id)
	const [flushPendingSelection, setFlushPendingSelection] = useState<
		(() => Promise<void>) | null
	>(null)
	const [loadedStructures, setLoadedStructures] =
		useState<ThyroidStructureJson | null>(null)
	const tool: 'polygon' = 'polygon'
	const usesGeneratedSlides = link1
		? isTiffUrl(link1) || isDicomUrl(link1)
		: false

	const handleSaveClick = async () => {
		await flushPendingSelection?.()
		await onSaveEdit?.()
	}

	const handleViewerApiReady = useCallback(
		(api: { flushPendingSelection: () => Promise<void> }) => {
			setFlushPendingSelection(() => api.flushPendingSelection)
		},
		[],
	)

	useEffect(() => {
		if (currentGroup !== undefined && currentGroup !== null) {
			setSelectedGroup(currentGroup)
			return
		}

		if (seg.length > 0) {
			setSelectedGroup(prev => prev ?? seg[0].id)
		} else {
			setSelectedGroup(undefined)
		}
	}, [currentGroup, seg])

	// Загружаем структуры ЩЖ из localStorage если они были сохранены
	useEffect(() => {
		const structures = loadThyroidStructures(imageid)
		if (structures) {
			setLoadedStructures(structures)
		}
	}, [imageid])

	const segmentOptions = useMemo(
		() =>
			seg.map((segment, index) => ({
				value: segment.id,
				label: `Узел ${index + 1} · TI-RADS ${segment.details?.nodule_type ?? '-'}`,
			})),
		[seg],
	)

	useEffect(() => {
		if (!link1) {
			setIsLoading(false)
			setImageDimensions(null)
			return
		}

		const prepareImage = async () => {
			try {
				if (usesGeneratedSlides) {
					const preparedArray = prepareTiffImageArray({
						slide_urls,
						slide_template:
							slide_template ?? deriveTiffSlideTemplate(link1) ?? undefined,
						image_count: image_count || 1,
					})
					setImgArray(preparedArray)
					setImageDimensions(null)
				} else {
					setImgArray([])
					const dimensions = await getImageDimensions(link1)
					setImageDimensions(dimensions)
				}

				setIsLoading(false)
			} catch (err) {
				console.error('Error preparing image:', err)
				setIsLoading(false)
				setImgArray([])
				setImageDimensions(null)
			}
		}

		prepareImage()
	}, [link1, image_count, slide_template, slide_urls])

	if (!link1) {
		return <NoImageState />
	}

	const imageSource = usesGeneratedSlides
		? imgArray
		: {
				type: 'image',
				url: link1,
				...(imageDimensions
					? {
							width: imageDimensions.width,
							height: imageDimensions.height,
						}
					: {}),
			}

	return (
		<div>
			<GalleryToolbar
				isEditMode={isEditMode}
				currentGroup={selectedGroup}
				segmentOptions={segmentOptions}
				onSelectGroup={value => setSelectedGroup(value)}
				onStartEdit={onStartEdit}
				onSave={handleSaveClick}
				onCancel={onCancelEdit}
				isSaving={isSaving}
				hasUnsavedChanges={hasUnsavedChanges}
			/>

			{isLoading ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						minHeight: viewerHeight,
					}}
				>
					<Spin size='large' />
				</div>
			) : (
				<div style={{ height: viewerHeight }}>
					<OpenSeadragonViewer
						key={`viewer-${viewerResetKey}-${isEditMode ? 'edit' : 'view'}`}
						image={imageSource}
						url={url}
						seg={seg}
						tool={tool}
						imageid={imageid}
						height={viewerHeight}
						readOnly={!isEditMode}
						currentGroup={selectedGroup}
						onDraftChangesChange={onDraftChangesChange}
						onViewerApiReady={handleViewerApiReady}
						thyroidStructures={
							thyroidStructures || loadedStructures || undefined
						}
					/>
				</div>
			)}
		</div>
	)
}

export default Gallery
