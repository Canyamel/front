import React from 'react'
import { ViewerPanel } from '@medml/viewers'
import type { UniqueNode } from './thyroidAnnotations'

export interface NodeLegendOverlayProps {
	nodes: UniqueNode[]
}

/**
 * Легенда узлов поверх снимка (цвет + TI-RADS тип). Чисто презентационный
 * компонент — использует `ViewerPanel` из `@medml/viewers` вместо
 * повторения инлайн-стилей "стеклянной" панели.
 */
const NodeLegendOverlay: React.FC<NodeLegendOverlayProps> = ({ nodes }) => {
	if (nodes.length === 0) return null

	return (
		<ViewerPanel position='top-left' minWidth={140} maxHeight='calc(100% - 40px)'>
			<div
				style={{
					fontSize: 14,
					fontWeight: 'bold',
					textAlign: 'center',
					color: '#333',
					marginBottom: 8,
					borderBottom: '1px solid #eee',
					paddingBottom: 4,
				}}
			>
				Узлы:
			</div>
			{nodes.map(node => (
				<div
					key={node.id}
					style={{
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
					<span style={{ flex: 1 }}>Узел {node.displayIndex}</span>
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
			))}
		</ViewerPanel>
	)
}

export default NodeLegendOverlay
