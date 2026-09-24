import React, { useEffect, useState } from 'react'
import type { OpenSeadragonAnnotator, Selection } from '@annotorious/openseadragon'
import { ViewerAnnotationPopup } from '@medml/viewers'

import CommentPopup from './Viewer/components/CommentPopup/CommentPopup'

/**
 * Карточка сегмента рядом с выделенной разметкой.
 *
 * Привязку к точке снимка и переезд карточки при зуме держит
 * `ViewerAnnotationPopup` из `@medml/viewers` — там же, где и пересчёт
 * координат. Здесь остаётся доменное: какая разметка выделена и что показать.
 */

interface SegmentPopupProps {
	annotator: OpenSeadragonAnnotator | null
	isEditingMode?: boolean
	needInput?: boolean
}

const SegmentPopup: React.FC<SegmentPopupProps> = ({
	annotator,
	isEditingMode = false,
	needInput = false,
}) => {
	// Инстанс движка берём у самого аннотатора: он к нему привязан, и лишнее
	// состояние в вызывающем компоненте не нужно.
	const viewer = annotator?.viewer ?? null

	const [selectedId, setSelectedId] = useState<string | null>(null)

	useEffect(() => {
		if (!annotator) {
			return
		}

		return annotator.state.selection.subscribe(({ selected }: Selection) => {
			setSelectedId(selected?.[0]?.id ?? null)
		})
	}, [annotator])

	const annotation = selectedId ? annotator?.getAnnotationById(selectedId) : undefined
	const bounds = annotation?.target?.selector?.geometry?.bounds

	if (!annotation || !bounds) {
		return null
	}

	return (
		<ViewerAnnotationPopup
			viewer={viewer}
			// Правый верхний угол разметки: карточка уходит в сторону и не
			// накрывает сам сегмент.
			anchor={{ x: bounds.maxX, y: bounds.minY }}
			className='cytology-segment-popup'
		>
			<CommentPopup
				annotation={annotation}
				needInput={needInput}
				isEditingMode={isEditingMode}
			/>
		</ViewerAnnotationPopup>
	)
}

export default SegmentPopup
