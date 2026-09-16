import React from 'react'
import { ViewerPanel } from '@medml/viewers'
import type { StructureLegendItem, UniqueNode } from './thyroidAnnotations'
import type { Segment } from '../model/types'
import { formatMm, pxToMm, segmentSizePx } from './measurement'

export interface NodeLegendOverlayProps {
	nodes: UniqueNode[]
	/** Нужны контуры, чтобы посчитать габариты узла. */
	seg?: Segment[]
	/** Масштаб; если не задан — размеры не показываем. */
	pxPerMm?: number | null
	/** Доли/перешеек текущего кадра; пустой список — блок не показывается. */
	structures?: StructureLegendItem[]
}

const sectionTitleStyle: React.CSSProperties = {
	fontSize: 14,
	fontWeight: 'bold',
	textAlign: 'center',
	color: '#333',
	marginBottom: 8,
	borderBottom: '1px solid #eee',
	paddingBottom: 4,
}

/**
 * Легенда узлов поверх снимка: цвет, TI-RADS и — после калибровки —
 * габариты образования в миллиметрах. Именно эти значения врач переносит
 * в форму заключения.
 */
const NodeLegendOverlay: React.FC<NodeLegendOverlayProps> = ({
	nodes,
	seg,
	pxPerMm,
	structures = [],
}) => {
	if (nodes.length === 0 && structures.length === 0) return null

	const sizeLabel = (nodeId: number): string | null => {
		if (pxPerMm == null) return null
		const segment = seg?.find(item => item.id === nodeId)
		const size = segmentSizePx(segment?.data)
		if (!size) return null

		const width = pxToMm(size.widthPx, pxPerMm)
		const height = pxToMm(size.heightPx, pxPerMm)
		if (width == null || height == null) return null

		return `${formatMm(width)} × ${formatMm(height)}`
	}

	return (
		<ViewerPanel position='top-left' minWidth={140} maxHeight='calc(100% - 40px)'>
			{nodes.length > 0 && <div style={sectionTitleStyle}>Узлы:</div>}
			{nodes.map(node => {
				const size = sizeLabel(node.id)
				return (
					<div
						key={node.id}
						title={node.onPage ? undefined : 'На этом кадре контура нет'}
						style={{
							// Узел без контура на текущем кадре — приглушён.
							opacity: node.onPage ? 1 : 0.45,
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							fontSize: 13,
							color: '#555',
							padding: '4px 0',
						}}
					>
						<div
							style={{
								width: 14,
								height: 14,
								backgroundColor: node.color,
								borderRadius: 3,
								border: '1px solid rgba(0,0,0,0.2)',
								flexShrink: 0,
							}}
						/>
						<span style={{ flex: 1 }}>
							Узел {node.displayIndex}
							{size && (
								<span style={{ display: 'block', fontSize: 11, color: '#777' }}>
									{size}
								</span>
							)}
						</span>
						<span
							style={{
								fontSize: 11,
								backgroundColor: '#f0f0f0',
								padding: '2px 6px',
								borderRadius: 10,
								fontWeight: 'bold',
							}}
						>
							TI-RADS {node.type}
						</span>
					</div>
				)
			})}

			{structures.length > 0 && (
				<>
					<div style={{ ...sectionTitleStyle, marginTop: nodes.length > 0 ? 8 : 0 }}>
						Структуры ЩЖ:
					</div>
					{structures.map(item => (
						<div
							key={item.key}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								fontSize: 13,
								color: '#555',
								padding: '4px 0',
							}}
						>
							{/* Пунктирная рамка — как контур структуры на снимке. */}
							<div
								style={{
									width: 14,
									height: 14,
									backgroundColor: `${item.color}33`,
									border: `2px dashed ${item.color}`,
									borderRadius: 3,
									flexShrink: 0,
								}}
							/>
							<span style={{ flex: 1 }}>{item.label}</span>
							{item.confidence != null && (
								<span style={{ fontSize: 11, color: '#777' }}>
									{Math.round(item.confidence * 100)}%
								</span>
							)}
						</div>
					))}
				</>
			)}
		</ViewerPanel>
	)
}

export default NodeLegendOverlay
