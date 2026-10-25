import { useCallback, useMemo, useState } from 'react'
import type { ViewerStatus } from '@medml/viewers'
import UziStudyViewer from '../viewer/UziStudyViewer'
import GalleryToolbar from './GalleryToolbar'
import NoImageState from './NoImageState'
import { useGalleryImageSource } from './useGalleryImageSource'
import type { GalleryProps } from './types'
import { isNewNodeId } from '../model/nodeEdits'
import { isClassSetByDoctor } from '../model/noduleClass'

const Gallery = ({
	link1,
	segments,
	imageid,
	image_count,
	slide_template,
	slide_urls,
	contourEditor,
	currentGroup,
	viewerHeight = 600,
	onPxPerMmChange,
	initialPxPerMm,
	filePixelSpacing,
	thyroidStructures,
}: GalleryProps) => {
	const [pickedGroup, setPickedGroup] = useState<string | number | undefined>()
	// Выбранного узла может уже не быть: новый узел после сохранения получает
	// id сервера, отменённый — исчезает.
	const pickedExists = pickedGroup != null && segments.some(segment => String(segment.id) === String(pickedGroup))
	const selectedGroup = currentGroup ?? (pickedExists ? pickedGroup : undefined) ?? segments[0]?.id
	const selectedType = segments.find(segment => String(segment.id) === String(selectedGroup))?.details?.nodule_type

	const handleAddNode = useCallback(
		(type: number) => setPickedGroup(contourEditor.addNode(type)),
		[contourEditor],
	)
	const handleChangeType = useCallback(
		(type: number) => {
			if (selectedGroup != null) contourEditor.setNodeType(Number(selectedGroup), type)
		},
		[contourEditor, selectedGroup],
	)

	const { isLoading, imageSource, slidesUnavailable } = useGalleryImageSource({
		link1,
		image_count,
		slide_template,
		slide_urls,
	})

	const segmentOptions = useMemo(
		() =>
			segments.map((segment, index) => ({
				value: segment.id,
				label: [
					`Узел ${index + 1} · TI-RADS ${segment.details?.nodule_type ?? '-'}`,
					isNewNodeId(segment.id) ? '(новый)' : isClassSetByDoctor(segment) ? '(специалист)' : null,
				]
					.filter(Boolean)
					.join(' '),
			})),
		[segments],
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
				isEditMode={contourEditor.isEditing}
				currentGroup={selectedGroup}
				segmentOptions={segmentOptions}
				onSelectGroup={setPickedGroup}
				currentType={selectedType}
				onChangeType={handleChangeType}
				onAddNode={handleAddNode}
				onStartEdit={contourEditor.start}
				onSave={contourEditor.save}
				onCancel={contourEditor.cancel}
				isSaving={contourEditor.isSaving}
				hasUnsavedChanges={contourEditor.hasChanges}
			/>

			<UziStudyViewer
				image={imageSource}
				segments={segments}
				imageid={imageid}
				drafts={contourEditor.drafts}
				height={viewerHeight}
				status={status}
				readOnly={!contourEditor.isEditing}
				currentGroup={selectedGroup}
				annotationApiRef={contourEditor.annotationApiRef}
				onPxPerMmChange={onPxPerMmChange}
				initialPxPerMm={initialPxPerMm}
				filePixelSpacing={filePixelSpacing}
				thyroidStructures={thyroidStructures}
			/>
		</div>
	)
}

export default Gallery
