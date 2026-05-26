import React from 'react'
import { Button, Space } from 'antd'
import type { ActionButtonsProps } from '@/features/thyroid-results/thyroidResultsTypes'

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSave }) => {
	return (
		<Space size='middle'>
			<Button type='primary' onClick={onSave}>
				Сохранить результат
			</Button>
		</Space>
	)
}

export default ActionButtons
