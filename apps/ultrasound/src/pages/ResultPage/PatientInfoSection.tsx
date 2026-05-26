import React from 'react'
import { Card, Descriptions, Typography, theme } from 'antd'
import type { PatientInfoSectionProps } from '@/lib/thyroidResultsTypes'
import { getSurfaceCardStyle } from '@/styles/uiPatterns'

const { Text } = Typography

const PatientInfoSection: React.FC<PatientInfoSectionProps> = ({
	patient,
	date,
}) => {
	const { token } = theme.useToken()

	return (
		<Card
			title='Данные пациента'
			style={{ ...getSurfaceCardStyle(token), height: '100%' }}
			styles={{ body: { padding: 12 } }}
		>
			<Descriptions column={1} size='small'>
				<Descriptions.Item label='Пациент'>
					<Text strong>
						{patient.last_name} {patient.first_name} {patient.fathers_name}
					</Text>
				</Descriptions.Item>
				<Descriptions.Item label='Полис'>
					<Text strong>{patient.personal_policy}</Text>
				</Descriptions.Item>
				<Descriptions.Item label='Дата исследования'>
					<Text strong>{new Date(date).toLocaleDateString()}</Text>
				</Descriptions.Item>
			</Descriptions>
		</Card>
	)
}

export default PatientInfoSection
