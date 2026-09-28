import React from 'react'
import { Button, Typography } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { ViewerAnnotationPopup } from '@medml/viewers'
import type { ViewerInstance } from '@medml/viewers'

import { getAnnotationProps, type ThyroidAnnotation, type UniqueNode } from './thyroidAnnotations'

const { Text } = Typography

export interface ThyroidAnnotationPopupProps {
	viewer: ViewerInstance | null
	annotation: ThyroidAnnotation | null
	/** Узлы снимка — чтобы подписать новый контур номером его узла. */
	nodes: UniqueNode[]
	/** В режиме просмотра карточка только информирует, удалить нельзя. */
	readOnly: boolean
	onRemove: (id: string) => void
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

const ThyroidAnnotationPopup: React.FC<ThyroidAnnotationPopupProps> = ({
	viewer,
	annotation,
	nodes,
	readOnly,
	onRemove,
}) => {
	const bounds = annotation?.target?.selector?.geometry?.bounds
	const props = getAnnotationProps(annotation)
	if (!annotation || !bounds) return null

	// Правый верхний угол контура: карточка уходит в сторону и не накрывает его.
	const anchor = { x: bounds.maxX, y: bounds.minY }

	if (props?.kind === 'structure') {
		return (
			<ViewerAnnotationPopup viewer={viewer} anchor={anchor}>
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
			</ViewerAnnotationPopup>
		)
	}

	const node = props?.group != null ? nodes.find(item => String(item.id) === String(props.group)) : undefined
	const displayIndex = props?.displayIndex ?? node?.displayIndex
	const tirads = props?.tirads ?? node?.type
	const color = props?.color ?? node?.color ?? '#FF0000'
	const probabilities = Object.entries(props?.probabilities ?? {}).filter(([, value]) => value !== '—')
	// Контуры с сервера всегда несут номер узла; у нарисованного или
	// созданного кистью, но не сохранённого, его нет.
	const isDraft = props?.displayIndex == null

	return (
		<ViewerAnnotationPopup viewer={viewer} anchor={anchor}>
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
						</span>
					)}
				</div>

				<Text type='secondary' style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
					{isDraft ? 'Не сохранён' : props?.isAi ? 'Найден ассистентом' : 'Отмечен врачом'}
				</Text>

				{probabilities.length > 0 && (
					<div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 12px' }}>
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
					<Button
						danger
						size='small'
						icon={<DeleteOutlined />}
						style={{ marginTop: 8, width: '100%' }}
						onClick={() => onRemove(annotation.id)}
					>
						Удалить контур
					</Button>
				)}
			</div>
		</ViewerAnnotationPopup>
	)
}

export default ThyroidAnnotationPopup
