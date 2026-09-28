import React from 'react'
import ViewerPanel from '../uzi-viewer/components/ViewerPanel'
import type { ViewerLegendItem } from './types'

export interface ViewerLegendOverlayProps {
	items: ViewerLegendItem[]
	title?: string
}

/**
 * Легенда разметки поверх снимка: цвет, подпись и значок класса.
 */
const sectionTitleStyle: React.CSSProperties = {
	fontSize: 14,
	fontWeight: 'bold',
	textAlign: 'center',
	color: '#333',
	marginBottom: 8,
	borderBottom: '1px solid #eee',
	paddingBottom: 4,
}

const ViewerLegendOverlay: React.FC<ViewerLegendOverlayProps> = ({ items, title = 'Разметка:' }) => {
	if (items.length === 0) return null

	return (
		<ViewerPanel position='top-left' minWidth={140} maxHeight='calc(100% - 40px)'>
			{items.map((item, index) => {
				// Заголовок — перед первой строкой каждого раздела. У первого
				// раздела это `title`, у остальных — имя раздела.
				const section = item.section ?? ''
				const startsSection = index === 0 || (items[index - 1].section ?? '') !== section
				const heading = index === 0 ? title : section

				return (
					<React.Fragment key={item.id}>
						{startsSection && heading && (
							<div style={{ ...sectionTitleStyle, marginTop: index === 0 ? 0 : 8 }}>{heading}</div>
						)}
						<div
							title={item.hint}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								fontSize: 13,
								color: '#555',
								padding: '4px 0',
								opacity: item.muted ? 0.45 : 1,
							}}
						>
							<div
								style={
									item.dashed
										? {
												width: 14,
												height: 14,
												backgroundColor: `${item.color}33`,
												border: `2px dashed ${item.color}`,
												borderRadius: 3,
												flexShrink: 0,
											}
										: {
												width: 14,
												height: 14,
												backgroundColor: item.color,
												borderRadius: 3,
												border: '1px solid rgba(0,0,0,0.2)',
												flexShrink: 0,
											}
								}
							/>
							<span style={{ flex: 1 }}>
								{item.title}
								{item.subtitle && (
									<span style={{ display: 'block', fontSize: 11, color: '#777' }}>{item.subtitle}</span>
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
					</React.Fragment>
				)
			})}
		</ViewerPanel>
	)
}

export default ViewerLegendOverlay
