import { useContext, useEffect, useMemo } from 'react'
import { Alert, Empty, Flex, Spin, Timeline } from 'antd'

import { ModalContext } from '@medml/ui'
import { formatApiError } from '@/lib/cytologyApi'
import { useGetCytologyHistoryQuery } from '@cytology/core/service/cytology'
import type { ICytologyHistoryItem } from '@cytology/core/types/cytology'

import CytologyHistoryCard from './CytologyHistoryCard/CytologyHistoryCard'

import './CytologyHistory.css'

interface CytologyHistoryProps {
	cytologyId: string
}

/**
 * История пересмотров исследования.
 */
const CytologyHistory: React.FC<CytologyHistoryProps> = ({ cytologyId }) => {
	const { changeModalProps } = useContext(ModalContext)
	const { data, error, isFetching } = useGetCytologyHistoryQuery(cytologyId)

	useEffect(() => {
		changeModalProps({
			title: 'История изменений',
			footer: [],
			centered: true,
			height: '80%',
			rootClassName: 'cytology-history-wrapper',
		})
	}, [changeModalProps])

	// Django отдаёт страницу `{count, results}`, Go-шлюз может ответить массивом.
	const items = useMemo<ICytologyHistoryItem[]>(() => {
		if (Array.isArray(data)) return data
		return data?.results ?? []
	}, [data])

	if (isFetching) {
		return (
			<Flex className='cytology-history-container' justify='center' align='center'>
				<Spin />
			</Flex>
		)
	}

	if (error) {
		return (
			<Flex className='cytology-history-container' vertical>
				<Alert
					type='error'
					showIcon
					message='Не удалось загрузить историю изменений'
					description={formatApiError(error)}
				/>
			</Flex>
		)
	}

	if (items.length === 0) {
		return (
			<Flex className='cytology-history-container' justify='center' align='center'>
				<Empty description='Пересмотров ещё не было' />
			</Flex>
		)
	}

	return (
		<Flex className='cytology-history-container' vertical>
			<Timeline
				mode='left'
				items={items.map((historyItem, index) => ({
					key: String(historyItem.id ?? index),
					children: <CytologyHistoryCard {...historyItem} />,
				}))}
			/>
		</Flex>
	)
}

export default CytologyHistory
