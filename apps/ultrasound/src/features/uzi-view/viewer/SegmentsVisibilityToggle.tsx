import React from 'react'
import { ViewerActionButton } from '@medml/viewers'

export interface SegmentsVisibilityToggleProps {
	visible: boolean
	onToggle: () => void
	label?: string
}

const SegmentsVisibilityToggle: React.FC<SegmentsVisibilityToggleProps> = ({ visible, onToggle, label }) => (
	<div
		style={{
			display: 'flex',
			flexDirection: 'column',
			gap: 4,
			alignItems: 'center',
		}}
	>
		{label && <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{label}</div>}
		<ViewerActionButton tone={visible ? 'green' : 'red'} compact onClick={onToggle}>
			{visible ? 'Скрыть' : 'Показать'}
		</ViewerActionButton>
		<div style={{ fontSize: 15, color: visible ? '#4CAF50' : '#f44336' }}>{visible ? 'ВКЛ' : 'ВЫКЛ'}</div>
	</div>
)

export default SegmentsVisibilityToggle
