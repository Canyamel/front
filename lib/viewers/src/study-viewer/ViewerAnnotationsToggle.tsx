import React from 'react'
import ViewerActionButton from '../uzi-viewer/components/ViewerActionButton'

export interface ViewerAnnotationsToggleProps {
	visible: boolean
	onToggle: () => void
}

/**
 * Кнопка «показать/скрыть разметку» в плавающем тулбаре.
 *
 * Была только в УЗИ (`SegmentsVisibilityToggle`), хотя нужна везде: разметка
 * закрывает сам снимок, и врачу приходится её убирать, чтобы посмотреть
 * исходное изображение.
 */
const ViewerAnnotationsToggle: React.FC<ViewerAnnotationsToggleProps> = ({
	visible,
	onToggle,
}) => (
	<div
		style={{
			display: 'flex',
			flexDirection: 'column',
			gap: 4,
			alignItems: 'center',
		}}
	>
		<ViewerActionButton tone={visible ? 'green' : 'red'} compact onClick={onToggle}>
			{visible ? 'Скрыть' : 'Показать'}
		</ViewerActionButton>
		<div style={{ fontSize: 15, color: visible ? '#4CAF50' : '#f44336' }}>
			{visible ? 'ВКЛ' : 'ВЫКЛ'}
		</div>
	</div>
)

export default ViewerAnnotationsToggle
