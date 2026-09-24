import React from 'react'
import ViewerPanel from '../uzi-viewer/components/ViewerPanel'
import type { ViewerLegendItem } from './types'

export interface ViewerLegendOverlayProps {
	items: ViewerLegendItem[]
	title?: string
}

/**
 * Легенда разметки поверх снимка: цвет, подпись и значок класса.
 *
 * Раньше существовала только в УЗИ (`NodeLegendOverlay`) и знала про узлы
 * и TI-RADS. Здесь она доменно-нейтральна: приложение готовит строки
 * (`ViewerLegendItem[]`) и само решает, что писать в подписи — габариты узла
 * в миллиметрах или название типа сегмента.
 */
const ViewerLegendOverlay: React.FC<ViewerLegendOverlayProps> = ({
	items,
	title = 'Разметка:',
}) => {
	if (items.length === 0) return null

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
				{title}
			</div>

			{items.map(item => (
				<div
					key={item.id}
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
							backgroundColor: item.color,
							borderRadius: 3,
							border: '1px solid rgba(0,0,0,0.2)',
							flexShrink: 0,
						}}
					/>
					<span style={{ flex: 1 }}>
						{item.title}
						{item.subtitle && (
							<span style={{ display: 'block', fontSize: 11, color: '#777' }}>
								{item.subtitle}
							</span>
						)}
					</span>
					{item.badge && (
						<span
							style={{
								fontSize: 11,
								backgroundColor: '#f0f0f0',
								padding: '2px 6px',
								borderRadius: 10,
								fontWeight: 'bold',
							}}
						>
							{item.badge}
						</span>
					)}
				</div>
			))}
		</ViewerPanel>
	)
}

export default ViewerLegendOverlay
