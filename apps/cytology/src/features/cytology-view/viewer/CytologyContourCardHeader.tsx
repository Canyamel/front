import React from 'react'
import { Button, Flex, Tag, Typography } from 'antd'
import { DeleteOutlined, UndoOutlined } from '@ant-design/icons'

import { getHighestProbIndex } from '../core/functions/highestProb'

const { Text } = Typography

interface CytologyContourCardHeaderProps {
	ai: boolean
	probs?: number[]
	isEditing: boolean
	/** Сегмент помечен на удаление в черновике. */
	deleted?: boolean
	onDelete: () => void
	onRestore: () => void
}

/** Шапка карточки сегмента: кто нашёл (ИИ или врач), категория Bethesda, удаление. */
export const CytologyContourCardHeader: React.FC<CytologyContourCardHeaderProps> = ({
	ai,
	probs,
	isEditing,
	deleted = false,
	onDelete,
	onRestore,
}) => {
	const label = ai ? 'ИИ' : 'Мед специалист'
	const category = probs ? getHighestProbIndex(probs) : null

	return (
		<Flex align='center' justify='space-between'>
			<Flex align='center' gap={10}>
				{category ? (
					<>
						<Text strong>{label}:</Text>
						<Tag color='blue'>{category}</Tag>
					</>
				) : (
					<Text strong>{label}</Text>
				)}
			</Flex>
			{isEditing && !deleted && (
				<Button onClick={onDelete} aria-label='Удалить сегмент'>
					<DeleteOutlined />
				</Button>
			)}
			{isEditing && deleted && (
				<Button onClick={onRestore} aria-label='Отменить удаление'>
					<UndoOutlined />
				</Button>
			)}
		</Flex>
	)
}
