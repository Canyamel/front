import React, { useContext, useState } from 'react'
import { Flex, Typography, Button } from 'antd'
import { DisconnectOutlined, FileTextOutlined } from '@ant-design/icons'

import { ModalContext } from '@medml/ui'

import { getHighestProbIndex } from '@cytology/core/functions/highestProb'

import { useCytologyView } from '@cytology/model'
import { CytologyReportModal, useCytologyReportExtras } from '@/features/cytology-report'
import { useCurrentDoctor } from '@/lib/useCurrentDoctor'

import ViewProbs from './ViewProbs/ViewProbs'

import './CytologyInfo.css'

const { Text, Title } = Typography

const CytologyInfo = () => {
	const { open } = useContext(ModalContext)
	const { info: cytologyInfo, segments, cytologyId } = useCytologyView()
	const { profile: doctor } = useCurrentDoctor()
	const { extras, setExtras } = useCytologyReportExtras(cytologyId)
	const [reportOpen, setReportOpen] = useState(false)

	const patientData = cytologyInfo?.patient
	const probs = cytologyInfo?.details?.probs

	const handleViewProbs = () => {
		if (probs) {
			open({
				content: <ViewProbs probs={probs} />,
			})
		}
	}

	return (
		<>
			{cytologyInfo && patientData && (
				<>
					<Title level={4}>
						Диагностика {cytologyInfo.diagnostic_marking}-{cytologyInfo.diagnostic_number} от{' '}
						{new Date(cytologyInfo?.diagnos_date).toLocaleDateString()}
					</Title>
					<Flex vertical>
						<Text type='secondary' strong>
							Новообразования
						</Text>
						{probs ? (
							<Button type='link' onClick={handleViewProbs} className='info-link-button'>
								<Title level={5} className='mt-0'>
									{getHighestProbIndex(probs)}
								</Title>
							</Button>
						) : (
							<Title level={5} className='mt-0'>
								Нет данных о категории
							</Title>
						)}
					</Flex>
					<Button type='primary' icon={<FileTextOutlined />} onClick={() => setReportOpen(true)} block>
						Отчёт по исследованию
					</Button>

					<CytologyReportModal
						open={reportOpen}
						onClose={() => setReportOpen(false)}
						info={cytologyInfo}
						segments={segments}
						doctor={doctor}
						extras={extras}
						onExtrasChange={setExtras}
					/>
				</>
			)}
			{(!patientData || !cytologyInfo) && (
				<Flex align='center' justify='center'>
					<DisconnectOutlined style={{ fontSize: 25, color: '#8c8c8c' }} />
				</Flex>
			)}
		</>
	)
}

export default CytologyInfo
