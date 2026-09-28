import React from 'react'
import { Alert, Spin, Typography } from 'antd'
import { FileImageOutlined } from '@ant-design/icons'

import type { ViewerStatus } from './types'

export interface ViewerStatusStateProps {
	status: ViewerStatus
	height?: number | string
}

const DEFAULT_TITLE: Record<ViewerStatus['kind'], string> = {
	loading: 'Загрузка изображения…',
	error: 'Не удалось загрузить изображение',
	empty: 'Снимок загружается или недоступен',
}

const wrapperStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	justifyContent: 'center',
	gap: 12,
	width: '100%',
	padding: '48px 24px',
	textAlign: 'center',
}

/**
 * Состояния вместо снимка: загрузка, ошибка, нет данных.
 */
const ViewerStatusState: React.FC<ViewerStatusStateProps> = ({ status, height = 600 }) => {
	const title = status.title ?? DEFAULT_TITLE[status.kind]

	return (
		<div style={{ ...wrapperStyle, minHeight: height }}>
			{status.kind === 'loading' && <Spin size='large' />}

			{status.kind === 'empty' && <FileImageOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />}

			{status.kind === 'error' ? (
				<Alert
					type='warning'
					showIcon
					style={{ width: '100%', textAlign: 'left' }}
					message={title}
					description={status.description}
				/>
			) : (
				<>
					<Typography.Paragraph style={{ margin: 0, color: 'rgba(0, 0, 0, 0.45)' }}>{title}</Typography.Paragraph>
					{status.description && <Typography.Text type='secondary'>{status.description}</Typography.Text>}
				</>
			)}
		</div>
	)
}

export default ViewerStatusState
