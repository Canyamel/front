import './viewer.scss'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnnotatedStudyViewer, ViewerAnnotationsToggle, contourGroupSizePx, pxToMm } from '@medml/viewers'
import type { ViewerImage, ViewerLegendItem } from '@medml/viewers'

import { formatNoduleMm, noduleDimensions } from '../model/noduleSize'
import { useUziContours } from './useUziContours'
import UziContourCard from './UziContourCard'
import type { DisplaySegment, UziAnnotationData } from './uziAnnotations'
import { UZI_VIEWER_TOOLS } from './constants'
import type { UziStudyViewerProps } from './types'

/**
 * Доменная обёртка над `<AnnotatedStudyViewer />` (`@medml/viewers`).
 *
 * Всё поведение рабочего места — инструменты, линейка с калибровкой, кисть,
 * легенда, состояния загрузки — живёт в общем вьюере. Здесь остаётся только
 * доменное: кадры снимка УЗИ, контуры узлов и структур ЩЖ по кадрам
 * (`useUziContours`), карточка контура и подписи легенды с габаритами
 * узлов в миллиметрах.
 */
const UziStudyViewer = ({
	image,
	segments,
	imageid,
	drafts,
	readOnly = true,
	height = 600,
	status,
	currentGroup,
	annotationApiRef,
	onPxPerMmChange,
	initialPxPerMm = null,
	filePixelSpacing,
	thyroidStructures,
}: UziStudyViewerProps) => {
	const [currentPage, setCurrentPage] = useState(0)
	const [annotationsVisible, setAnnotationsVisible] = useState(true)
	const [structuresVisible, setStructuresVisible] = useState(true)
	const [pxPerMm, setPxPerMm] = useState<number | null>(initialPxPerMm)

	const handlePxPerMmChange = useCallback(
		(next: number | null) => {
			setPxPerMm(next)
			onPxPerMmChange?.(next)
		},
		[onPxPerMmChange],
	)

	const images: ViewerImage[] = useMemo(() => {
		const list = Array.isArray(image) ? image : image ? [image] : []
		return list.map((tile, index) => ({
			id: `${imageid}-${index}`,
			url: tile.url,
			tileSource: tile as unknown as ViewerImage['tileSource'],
			width: tile.width,
			height: tile.height,
		}))
	}, [image, imageid])

	const { annotations, onChange, style, createData, displaySegments, uniqueNodes, structureItems, hasStructures } =
		useUziContours({
			images,
			segments,
			drafts: readOnly ? undefined : drafts,
			currentPage,
			annotationsVisible,
			structuresVisible,
			currentGroup,
			thyroidStructures,
		})

	useEffect(() => {
		if (images.length < 2) return
		for (const index of [currentPage + 1, currentPage + 2, currentPage - 1]) {
			const url = images[index]?.url
			if (url) {
				const preload = new Image()
				preload.src = url
			}
		}
	}, [images, currentPage])

	// Узлы с несохранёнными правками контуров: размеры бэкенда для них уже
	// устарели, считаем по контуру на экране.
	const editedNodeIds = useMemo(() => {
		const ids = new Set<string>()
		if (readOnly || !drafts) return ids
		drafts.drafts.forEach((draft, key) => {
			if (draft.data?.group != null) ids.add(String(draft.data.group))
			const owner = segments.find(segment => segment.data?.some(contour => String(contour.id) === key))
			if (owner) ids.add(String(owner.id))
		})
		return ids
	}, [readOnly, drafts, segments])

	const legendItems = useMemo<ViewerLegendItem[]>(
		() => [
			...uniqueNodes.map((node): ViewerLegendItem => {
				const segment = displaySegments.find(item => item.id === node.id)
				const { subtitle, sizeHint } = legendNodeSize(segment, editedNodeIds.has(String(node.id)), pxPerMm)

				return {
					id: node.id,
					color: node.color,
					title: `Узел ${node.displayIndex}`,
					subtitle,
					badge: `TI-RADS ${node.type}`,
					muted: !node.onPage,
					hint:
						[node.onPage ? undefined : 'На этом кадре контура нет', sizeHint].filter(Boolean).join('. ') || undefined,
				}
			}),
			...(structuresVisible
				? structureItems.map(
						(item): ViewerLegendItem => ({
							id: `structure-${item.key}`,
							color: item.color,
							title: item.label,
							badge: item.confidence != null ? `${Math.round(item.confidence * 100)}%` : null,
							section: 'Структуры ЩЖ:',
							dashed: true,
						}),
					)
				: []),
		],
		[uniqueNodes, displaySegments, editedNodeIds, pxPerMm, structuresVisible, structureItems],
	)

	return (
		<AnnotatedStudyViewer<UziAnnotationData>
			images={images}
			annotations={annotations}
			annotationStyle={style}
			onAnnotationChange={onChange}
			newAnnotationData={createData}
			annotationApiRef={annotationApiRef}
			// Новый контур некуда сохранить, пока не выбран узел.
			canDraw={currentGroup != null}
			renderAnnotationPopup={context => <UziContourCard {...context} nodes={uniqueNodes} />}
			tools={UZI_VIEWER_TOOLS}
			readOnly={readOnly}
			height={height}
			status={status}
			onIndexChange={setCurrentPage}
			onPxPerMmChange={handlePxPerMmChange}
			initialPxPerMm={initialPxPerMm}
			filePixelSpacing={filePixelSpacing}
			legendItems={legendItems}
			legendTitle={uniqueNodes.length > 0 ? 'Узлы:' : 'Структуры ЩЖ:'}
			annotationsVisible={annotationsVisible}
			onAnnotationsVisibleChange={setAnnotationsVisible}
			annotationsToggleLabel={hasStructures ? 'Узлы' : undefined}
			customToolbarSlot={
				hasStructures ? (
					<ViewerAnnotationsToggle
						label='Доли'
						visible={structuresVisible}
						onToggle={() => setStructuresVisible(prev => !prev)}
					/>
				) : undefined
			}
		/>
	)
}

function legendNodeSize(
	segment: DisplaySegment | undefined,
	edited: boolean,
	pxPerMm: number | null,
): { subtitle: string | null; sizeHint?: string } {
	const dimensions = edited ? [] : noduleDimensions(segment?.details)
	if (dimensions.length === 2) {
		const [first, second] = dimensions
		return {
			subtitle: `${formatNoduleMm(first.mm)} × ${formatNoduleMm(second.mm)} мм`,
			sizeHint: `${first.label} × ${second.label}, как в заключении`,
		}
	}

	const size = contourGroupSizePx(segment?.data)
	const width = size ? pxToMm(size.widthPx, pxPerMm) : null
	const height = size ? pxToMm(size.heightPx, pxPerMm) : null
	if (width == null || height == null) return { subtitle: null }
	return {
		subtitle: `≈ ${formatNoduleMm(width)} × ${formatNoduleMm(height)} мм`,
		sizeHint: 'Габариты контура на экране, приблизительно',
	}
}

export default UziStudyViewer
