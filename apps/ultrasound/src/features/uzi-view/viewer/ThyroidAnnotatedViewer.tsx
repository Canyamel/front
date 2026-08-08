import { useEffect, useMemo, useState } from 'react'
import { UziViewer } from '@medml/viewers'
import type { ViewerImage, ViewerInstance } from '@medml/viewers'
import { useThyroidAnnotator } from './useThyroidAnnotator'
import NodeLegendOverlay from './NodeLegendOverlay'
import SegmentsVisibilityToggle from './SegmentsVisibilityToggle'
import type { ThyroidAnnotatedViewerProps } from './types'

/**
 * Доменная обёртка над `<UziViewer />` (`@medml/viewers`).
 *
 * Всё "чистое" управление OpenSeadragon (zoom/pan/rotate/tileSources/resize,
 * постраничная навигация) живёт в `@medml/viewers`. Всё, что касается
 * Annotorious и построения аннотаций из доменных данных УЗИ (узлы, контуры
 * структур ЩЖ, черновики изменений), вынесено в `useThyroidAnnotator` +
 * `thyroidAnnotations.ts`. Легенда узлов и переключатель видимости —
 * отдельные презентационные компоненты (`NodeLegendOverlay`,
 * `SegmentsVisibilityToggle`).
 *
 * Этот компонент — только композиция: пропсы → `ViewerImage[]`, подключение
 * хука к живому инстансу OSD (через `onInstanceReady`) и передача слотов в
 * `<UziViewer />`. Никакой Annotorious-логики или инлайн-стилей здесь больше нет.
 */
const ThyroidAnnotatedViewer = ({
	image,
	tool,
	seg,
	imageid,
	readOnly = true,
	height = 600,
	currentGroup,
	onDraftChangesChange,
	onViewerApiReady,
	thyroidStructures,
}: ThyroidAnnotatedViewerProps) => {
	const [osdViewer, setOsdViewer] = useState<ViewerInstance | null>(null)
	const [currentPage, setCurrentPage] = useState(0)

	// Универсальные ViewerImage[] для @medml/viewers. Мемоизируем, чтобы
	// не пересоздавать инстанс OpenSeadragon на каждый ре-рендер.
	const images: ViewerImage[] = useMemo(() => {
		const list = Array.isArray(image) ? image : image ? [image] : []
		return list.map((tile, index) => ({
			id: `${imageid}-${index}`,
			url: tile.url,
			// ImageTile уже является валидным OSD tileSource ({ type: 'image', url, ... }).
			tileSource: tile as unknown as ViewerImage['tileSource'],
			width: tile.width,
			height: tile.height,
		}))
	}, [image, imageid])

	const { showSegments, toggleSegments, uniqueNodes, flushPendingSelection } =
		useThyroidAnnotator({
			osdViewer,
			images,
			seg,
			tool,
			readOnly,
			currentPage,
			currentGroup,
			thyroidStructures,
			onDraftChangesChange,
		})

	useEffect(() => {
		onViewerApiReady?.({ flushPendingSelection })
	}, [flushPendingSelection, onViewerApiReady])

	return (
		<UziViewer
			images={images}
			onIndexChange={setCurrentPage}
			activeTool={tool}
			height={height}
			readOnly={readOnly}
			onInstanceReady={viewer => setOsdViewer(viewer)}
			onInstanceWillDestroy={() => setOsdViewer(null)}
			overlaySlot={() =>
				showSegments && uniqueNodes.length > 0 ? (
					<NodeLegendOverlay nodes={uniqueNodes} />
				) : null
			}
			customToolbarSlot={
				<SegmentsVisibilityToggle visible={showSegments} onToggle={toggleSegments} />
			}
		/>
	)
}

export default ThyroidAnnotatedViewer
