import React from 'react'
import { Card, Flex, Typography } from 'antd'
import { formatMm, pxToMm } from '@medml/viewers'
import type { ViewerAnnotationPopupContext } from '@medml/viewers'

import { CytologyContourCardHeader } from './CytologyContourCardHeader'
import type { CytologyAnnotationData } from './cytologyAnnotations'

const { Title, Text } = Typography

const SEGMENT_DETAIL_FIELDS = [
	{ key: 'area', label: 'Area' },
	{ key: 'min_d', label: 'Min D' },
	{ key: 'max_d', label: 'Max D' },
	{ key: 'aspect_ratio', label: 'Aspect ratio' },
	{ key: 'circularity', label: 'Circularity' },
	{ key: 'nuclear_cytoplasmic_ratio', label: 'Nuclear cytoplasmic ratio' },
] as const

const titleStyle: React.CSSProperties = { marginBottom: 0 }

function hasDetailValue(value: unknown): boolean {
	return value !== null && value !== undefined && value !== ''
}

export interface CytologyContourCardProps extends ViewerAnnotationPopupContext<CytologyAnnotationData> {
	/** Отменить пометку на удаление. */
	onRestore: () => void
}

/**
 * Карточка выделенного сегмента. К контуру
 * её привязывает вьюер, здесь только содержимое.
 */
const CytologyContourCard: React.FC<CytologyContourCardProps> = ({
	annotation,
	readOnly,
	remove,
	pxPerMm,
	onRestore,
}) => {
	const data = annotation.data
	if (!data) return null

	const details = data.details
	const filledDetailFields = details ? SEGMENT_DETAIL_FIELDS.filter(field => hasDetailValue(details[field.key])) : []

	const xs = annotation.points.map(point => point.x)
	const ys = annotation.points.map(point => point.y)
	const sizeLabel =
		pxPerMm != null && xs.length > 0
			? `${formatMm(pxToMm(Math.max(...xs) - Math.min(...xs), pxPerMm))} × ${formatMm(
					pxToMm(Math.max(...ys) - Math.min(...ys), pxPerMm),
				)}`
			: null

	return (
		<Card size='small' style={{ width: 350, maxHeight: 400 }}>
			<CytologyContourCardHeader
				ai={Boolean(data.ai)}
				probs={details?.probs}
				isEditing={!readOnly}
				deleted={data.draft === 'delete'}
				onDelete={remove}
				onRestore={onRestore}
			/>
			{sizeLabel && (
				<Flex vertical>
					<Title level={5} style={titleStyle}>
						Размер
					</Title>
					<Text>{sizeLabel}</Text>
				</Flex>
			)}
			{filledDetailFields.length > 0 && (
				<Flex vertical gap={8}>
					{filledDetailFields.map(field => (
						<Flex vertical key={field.key}>
							<Title level={5} style={titleStyle}>
								{field.label}
							</Title>
							<Text>{details?.[field.key]}</Text>
						</Flex>
					))}
				</Flex>
			)}
		</Card>
	)
}

export default CytologyContourCard
