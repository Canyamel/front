import React from 'react'
import { Card, Tag, Tooltip, Typography, theme } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import type { Segment } from '../model/types'
import { getSurfaceCardStyle } from '@/styles/uiPatterns'
import { aiClassProbabilities, formatPercent, isClassSetByDoctor, topAiClass } from '../model/noduleClass'
import { NODE_COLORS } from '../viewer/constants'

export interface NoduleTypesSectionProps {
	/** Узлы в том порядке, в каком их нумерует вьюер. */
	nodules: Segment[]
}

const { Text } = Typography

const TIRADS_TAG_COLORS: Record<number, string> = {
	2: 'green',
	3: 'gold',
	4: 'orange',
	5: 'red',
}

const rowStyle: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: '12px auto auto 1fr',
	alignItems: 'center',
	columnGap: 8,
	rowGap: 2,
	padding: '6px 0',
}

const swatchStyle = (color: string): React.CSSProperties => ({
	width: 12,
	height: 12,
	borderRadius: 3,
	backgroundColor: color,
	border: '1px solid rgba(0,0,0,0.2)',
})

/** Все вероятности ассистента — во всплывающей подсказке, чтобы не загромождать карточку. */
function probabilitiesHint(segment: Segment): string | undefined {
	const items = aiClassProbabilities(segment.details)
	if (items.length === 0) return undefined
	return items.map(item => `TI-RADS ${item.type}: ${formatPercent(item.probability)}`).join(', ')
}

const NoduleTypesSection: React.FC<NoduleTypesSectionProps> = ({ nodules }) => {
	const { token } = theme.useToken()

	return (
		<Card
			title='Типы новообразований'
			style={{ ...getSurfaceCardStyle(token), height: '100%' }}
			styles={{ body: { padding: '6px 12px' } }}
		>
			{nodules.length === 0 && <Text type='secondary'>Узлы не найдены</Text>}

			{nodules.map((segment, index) => {
				const type = segment.details?.nodule_type
				const byDoctor = isClassSetByDoctor(segment)
				const top = segment.is_ai ? topAiClass(segment.details) : undefined
				const hint = segment.is_ai ? probabilitiesHint(segment) : undefined

				// Категория ассистента совпадает с категорией узла — хватает
				// уверенности в ней. Иначе показываем всю оценку ассистента,
				// самую вероятную категорию выделяем.
				const showAll = top != null && (byDoctor || top.type !== type)
				const aiText =
					top == null ? null : showAll ? (
						<>
							ассистент:{' '}
							{aiClassProbabilities(segment.details).map((item, itemIndex) => (
								<React.Fragment key={item.type}>
									{itemIndex > 0 && ', '}
									<span style={item.type === top.type ? { fontWeight: 600 } : undefined}>
										TI-RADS {item.type} · {formatPercent(item.probability)}
									</span>
								</React.Fragment>
							))}
						</>
					) : (
						`уверенность ${formatPercent(top.probability)}`
					)

				return (
					<div
						key={segment.id}
						style={{ ...rowStyle, borderTop: index > 0 ? `1px solid ${token.colorBorderSecondary}` : undefined }}
					>
						<span style={swatchStyle(NODE_COLORS[index % NODE_COLORS.length])} />
						<Text strong>Узел {index + 1}</Text>
						<Tag color={type != null ? TIRADS_TAG_COLORS[type] : undefined} style={{ marginInlineEnd: 0 }}>
							TI-RADS {type ?? '—'}
						</Tag>
						<Text type='secondary' style={{ fontSize: 13 }}>
							{byDoctor ? (
								<>
									<UserOutlined /> специалист
								</>
							) : (
								'ассистент'
							)}
						</Text>

						{aiText && (
							<Tooltip title={showAll ? undefined : hint}>
								<Text type='secondary' style={{ gridColumn: '2 / -1', fontSize: 12 }}>
									{aiText}
								</Text>
							</Tooltip>
						)}
					</div>
				)
			})}
		</Card>
	)
}

export default NoduleTypesSection
