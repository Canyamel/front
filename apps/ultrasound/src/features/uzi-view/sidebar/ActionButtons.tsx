import React from 'react'
import { Button, Space } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'

export interface ActionButtonsProps {
	onSave: () => Promise<void>
	/** Открыть предпросмотр заключения. Ничего не пишет на сервер. */
	onOpenReport: () => void
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSave, onOpenReport }) => {
	return (
		<Space size='middle' wrap>
			<Button type='primary' onClick={onSave}>
				Сохранить результат
			</Button>
			<Button icon={<FileTextOutlined />} onClick={onOpenReport}>
				Заключение
			</Button>
		</Space>
	)
}

export default ActionButtons
