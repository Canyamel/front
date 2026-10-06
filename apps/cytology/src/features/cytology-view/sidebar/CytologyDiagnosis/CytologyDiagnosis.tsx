import React, { useCallback, useContext } from 'react'
import { Typography, Button, Flex } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'

import { ISegmentType, SegmentType } from '@cytology/core/types/segments'
import { useCytologyView } from '@cytology/model'
import { ModalContext } from '@medml/ui'

import DiagnosisCard from '../DiagnosisCard/DiagnosisCard'


import CytologyInfo from './CytologyInfo/CytologyInfo'

import './CytologyDiagnosis.css'
import CytologyHistory from './CytologyHistory/CytologyHistory'

const { Text } = Typography

interface ICytologyDiagnosisProps {
	onClickCard: (newValue: SegmentType) => void
}

const CytologyDiagnosis: React.FC<ICytologyDiagnosisProps> = ({ onClickCard }) => {
	const { open } = useContext(ModalContext)
	const { cytologyId, segmentTypes, currentType } = useCytologyView()

	// Историю грузит сама модалка — запрос уходит по нажатию, а не вместе со
	// страницей снимка. Кнопка срабатывает всегда: ошибку видно внутри модалки.
	const handleOpenHistory = useCallback(() => {
		open({ content: <CytologyHistory cytologyId={cytologyId} /> })
	}, [cytologyId, open])


	return (
		<Flex vertical className='cytology-diagnosis-wrapper'>
			<CytologyInfo />
			<Flex vertical gap={5} className='cytology-diagnosis-cards-wrapper'>
				{segmentTypes.map((segment: ISegmentType) => (
					<DiagnosisCard
						segmentType={segment.code as SegmentType}
						label={segment.label}
						isActive={currentType === (segment.code as SegmentType)}
						onClick={() => onClickCard(segment.code as SegmentType)}
						key={segment.code}
					/>
				))}
			</Flex>
			<Button className='cytology-diagnosis-edit' type='default' onClick={handleOpenHistory}>
				<Flex gap={10} align='center'>
					<Text className='text-inherit'>История изменений</Text>
					<HistoryOutlined />
				</Flex>
			</Button>
		</Flex>
	)
}

export default CytologyDiagnosis
