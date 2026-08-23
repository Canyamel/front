import React from 'react'

import { OpenSeadragonAnnotationPopup, OpenSeadragonAnnotator, OpenSeadragonViewer } from '@annotorious/react'

import { useDziTileSource } from '@/lib/useDziTileSource'

import CommentPopup from '../CommentPopup/CommentPopup'

interface OSDViewerProps {
	drawingEnable?: boolean
	needPopup?: boolean
	tool: 'rectangle' | 'polygon' | 'move'
	selected: boolean
	imageUrl: string
	needInputPopup?: boolean
}

const OSDViewer: React.FC<OSDViewerProps> = ({
	drawingEnable = false,
	needPopup = false,
	tool,
	imageUrl,
	selected,
	needInputPopup = false,
}) => {
	const { tileSource, isLoading, error } = useDziTileSource(imageUrl)

	const options = React.useMemo(
		() => ({
			tileSources: tileSource ?? undefined,
			prefixUrl: '/openseadragon-images/',
			gestureSettingsMouse: {
				clickToZoom: false,
			},
		}),
		[tileSource],
	)

	const placeholder = (text: string) => <p style={{ width: '100%', height: '100%', margin: 0 }}>{text}</p>

	if (imageUrl === '') return placeholder('Изображение отсутствует')
	if (error) return placeholder(`Не удалось загрузить изображение: ${error}`)
	if (isLoading || !tileSource) return placeholder('Загрузка изображения…')

	return (
		<>
			{imageUrl !== '' ? (
				<OpenSeadragonAnnotator
					drawingEnabled={drawingEnable && tool !== 'move' && selected}
					tool={tool !== 'move' ? tool : null}
				>
					<OpenSeadragonViewer options={options} className='osd' />
					{needPopup && (
						<OpenSeadragonAnnotationPopup
							popup={props => <CommentPopup {...props} needInput={needInputPopup} isEditingMode={drawingEnable} />}
						/>
					)}
				</OpenSeadragonAnnotator>
			) : (
				<p style={{ width: '100%', height: '100%', margin: 0 }}>Изображение отсутствует</p>
			)}
		</>
	)
}

export default OSDViewer
