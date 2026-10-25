import React from 'react'
import { Button, Tooltip, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { ViewerAnnotationPopupContext } from '@medml/viewers'

import type { UziAnnotationData, UniqueNode } from './uziAnnotations'

const { Text } = Typography

export interface UziContourCardProps extends ViewerAnnotationPopupContext<UziAnnotationData> {
	nodes: UniqueNode[]
}

const cardStyle: React.CSSProperties = {
	background: '#fff',
	border: '1px solid #e2e8f0',
	borderRadius: 12,
	boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
	padding: '10px 12px',
	minWidth: 200,
	fontSize: 13,
}

const swatch = (color: string, dashed = false): React.CSSProperties => ({
	width: 12,
	height: 12,
	borderRadius: 3,
	flexShrink: 0,
	...(dashed
		? { backgroundColor: `${color}33`, border: `2px dashed ${color}` }
		: { backgroundColor: color, border: '1px solid rgba(0,0,0,0.2)' }),
})

/**
 * Карточка выделенного контура: узел или структура ЩЖ. К контуру её
 * привязывает вьюер, здесь только содержимое.
 */
const UziContourCard: React.FC<UziContourCardProps> = ({ annotation, nodes, readOnly, remove }) => {
	const props = annotation.data

	if (props?.kind === 'structure') {
		return (
			<div style={cardStyle}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<div style={swatch(props.color, true)} />
					<Text strong>{props.label}</Text>
				</div>
				<Text type='secondary' style={{ fontSize: 12 }}>
					{props.confidence != null
						? `Достоверность ${(props.confidence * 100).toFixed(1)}%`
						: 'Достоверность неизвестна'}
				</Text>
			</div>
		)
	}

	const node = props?.group != null ? nodes.find(item => String(item.id) === String(props.group)) : undefined
	const displayIndex = props?.displayIndex ?? node?.displayIndex
	const tirads = props?.tirads ?? node?.type
	const tiradsByDoctor = props?.tiradsByDoctor ?? node?.typeByDoctor ?? false
	const color = props?.color ?? node?.color ?? '#FF0000'
	const probabilities = Object.entries(props?.probabilities ?? {}).filter(([, value]) => value !== '—')
	// Контуры с сервера всегда несут номер узла; у нарисованного или
	// созданного кистью, но не сохранённого, его нет.
	const isDraft = props?.displayIndex == null
	const detection = props?.detectionConfidence

	return (
		<div style={cardStyle}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
				<div style={swatch(color)} />
				<Text strong style={{ flex: 1 }}>
					{displayIndex != null ? `Узел ${displayIndex}` : 'Новый контур'}
				</Text>
				{tirads != null && tirads !== '-' && (
					<span
						style={{
							fontSize: 11,
							backgroundColor: '#f0f0f0',
							padding: '2px 6px',
							borderRadius: 10,
							fontWeight: 'bold',
						}}
					>
						TI-RADS {tirads}
						{tiradsByDoctor && ' · специалист'}
					</span>
				)}
			</div>

			{detection && (
				<Tooltip
					title={
						detection.scope === 'frame'
							? 'Уверенность детектора в узле на этом кадре'
							: 'Средняя уверенность детектора по кадрам, где найден узел'
					}
				>
					<Text style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
						Уверенность {(detection.value * 100).toFixed(1)}%
					</Text>
				</Tooltip>
			)}

			<Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
				{isDraft ? 'Не сохранён' : props?.isAi ? 'Найден ассистентом' : 'Отмечен врачом'}
			</Text>

			{tiradsByDoctor && props?.isAi && (
				<Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
					Категорию изменил специалист
				</Text>
			)}

			{probabilities.length > 0 && tiradsByDoctor && (
				<Text type='secondary' style={{ display: 'block', fontSize: 11, marginTop: 6 }}>
					Оценка ассистента:
				</Text>
			)}

			{probabilities.length > 0 && (
				<div
					style={{
						marginTop: tiradsByDoctor ? 2 : 6,
						display: 'grid',
						gridTemplateColumns: 'auto auto',
						gap: '2px 12px',
					}}
				>
					{probabilities.map(([label, value]) => (
						<React.Fragment key={label}>
							<Text type='secondary' style={{ fontSize: 12 }}>
								{label}
							</Text>
							<Text style={{ fontSize: 12, textAlign: 'right' }}>{value}</Text>
						</React.Fragment>
					))}
				</div>
			)}

			{!readOnly && (
				<Button danger size='small' icon={<DeleteOutlined />} style={{ marginTop: 8, width: '100%' }} onClick={remove}>
					Удалить контур
				</Button>
			)}
		</div>
	)
}

export default UziContourCard
