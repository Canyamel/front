import { useMemo, useRef, useState } from 'react'
import type { ViewerAnnotationApi, ViewerStatus } from '@medml/viewers'
import ThyroidAnnotatedViewer from '../viewer/ThyroidAnnotatedViewer'
import GalleryToolbar from './GalleryToolbar'
import NoImageState from './NoImageState'
import { useGalleryImageSource } from './useGalleryImageSource'
import type { GalleryProps } from './types'

const Gallery = ({
	link1,
	seg,
	imageid,
	image_count,
	slide_template,
	slide_urls,
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
	onPxPerMmChange,
	thyroidStructures,
}: GalleryProps) => {
	const [pickedGroup, setPickedGroup] = useState<string | number | undefined>()
	const selectedGroup = currentGroup ?? pickedGroup ?? seg[0]?.id

	// Annotorious сообщает о правке контура, только когда с него снимают
	// выделение, — перед сохранением её нужно досохранить в черновик.
	const annotationApiRef = useRef<ViewerAnnotationApi>(null)

	const { isLoading, imageSource, slidesUnavailable } = useGalleryImageSource({
		link1,
		image_count,
		slide_template,
		slide_urls,
	})

	const handleSaveClick = async () => {
		await annotationApiRef.current?.commitSelection()
		await onSaveEdit?.()
	}

	const segmentOptions = useMemo(
		() =>
			seg.map((segment, index) => ({
				value: segment.id,
				label: `Узел ${index + 1} · TI-RADS ${segment.details?.nodule_type ?? '-'}`,
			})),
		[seg],
	)

	const status = useMemo<ViewerStatus | null>(() => {
		if (isLoading) return { kind: 'loading', title: 'Подготовка кадров снимка…' }
		if (slidesUnavailable) {
			return {
				kind: 'error',
				title: 'Кадры снимка ещё не готовы',
				description:
					'Для TIFF и DICOM бэкенд готовит PNG-нарезку. Если снимок загружен только что — обновите страницу через минуту.',
			}
		}
		return null
	}, [isLoading, slidesUnavailable])

	if (!link1) {
		return <NoImageState />
	}

	return (
		<div>
			<GalleryToolbar
				isEditMode={isEditMode}
				currentGroup={selectedGroup}
				segmentOptions={segmentOptions}
				onSelectGroup={setPickedGroup}
				onStartEdit={onStartEdit}
				onSave={handleSaveClick}
				onCancel={onCancelEdit}
				isSaving={isSaving}
				hasUnsavedChanges={hasUnsavedChanges}
			/>

			<ThyroidAnnotatedViewer
				key={`viewer-${viewerResetKey}-${isEditMode ? 'edit' : 'view'}`}
				image={imageSource}
				seg={seg}
				imageid={imageid}
				height={viewerHeight}
				status={status}
				readOnly={!isEditMode}
				currentGroup={selectedGroup}
				onDraftChangesChange={onDraftChangesChange}
				annotationApiRef={annotationApiRef}
				onPxPerMmChange={onPxPerMmChange}
				thyroidStructures={thyroidStructures}
			/>
		</div>
	)
}

export default Gallery
