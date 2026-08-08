import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Layout, Space, Table, Typography } from 'antd'

import { PatientProfileView } from '@medml/patient_view'

import {
	useGetMedPatientByIdQuery,
	useGetMedPatientCardQuery,
	useGetPatientUziStudiesQuery,
	type PatientUziStudyRow,
} from '@/api/patientProfileApi'
import { useGetUziDevicesQuery } from '@/api/uziApi'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import { useUziStudyColumns } from './patientProfile/uziStudyColumns'

const cardStyle: React.CSSProperties = {
	borderRadius: 12,
	width: '100%',
	border: '1px solid rgba(0,0,0,0.06)',
	boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

/** Загрузка карточки пациента и его снимков + состояние пагинации таблицы. */
function usePatientProfileData(patientId: string) {
	const { doctorId, status } = useDoctorId()
	const authed = status === 'authenticated'

	const [uziPage, setUziPage] = React.useState(1)
	const [uziPageSize, setUziPageSize] = React.useState(10)

	React.useEffect(() => {
		setUziPage(1)
	}, [patientId])

	const { data: devices = [] } = useGetUziDevicesQuery(undefined, { skip: !authed })

	const deviceMap = React.useMemo(
		() => new Map(devices.map(d => [String(d.id), d.name])),
		[devices],
	)

	const {
		data: patientApi,
		isLoading: patientLoading,
		isError: patientError,
	} = useGetMedPatientByIdQuery(patientId, { skip: !patientId || !authed })

	const { data: cardApi } = useGetMedPatientCardQuery(
		{ doctorId, patientId },
		{ skip: !doctorId || !patientId || !authed },
	)

	const { data: uziRows = [], isFetching: uziLoading } = useGetPatientUziStudiesQuery(
		patientId,
		{ skip: !patientId || !authed },
	)

	const patient = React.useMemo(() => {
		if (!patientApi) return null
		return {
			...patientApi,
			diagnosis: cardApi?.diagnosis ?? patientApi.diagnosis ?? '',
		}
	}, [patientApi, cardApi])

	const uziPagination = React.useMemo(
		() => ({
			current: uziPage,
			pageSize: uziPageSize,
			total: uziRows.length,
			showSizeChanger: true,
			pageSizeOptions: [10, 20, 50],
			showTotal: (total: number, range: [number, number]) =>
				total <= 0 ? '0 снимков' : `${range[0]}–${range[1]} из ${total} снимков`,
			onChange: (page: number, size?: number) => {
				const nextSize = size ?? uziPageSize
				if (nextSize !== uziPageSize) {
					setUziPageSize(nextSize)
					setUziPage(1)
				} else {
					setUziPage(page)
				}
			},
		}),
		[uziPage, uziPageSize, uziRows.length],
	)

	return {
		patient,
		patientError,
		patientLoading,
		loading: (authed && !doctorId) || patientLoading,
		deviceMap,
		uziRows,
		uziLoading,
		uziPagination,
	}
}

export default function PatientProfileRoute() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const patientId = searchParams.get('id')?.trim() ?? ''

	const {
		patient,
		patientError,
		patientLoading,
		loading,
		deviceMap,
		uziRows,
		uziLoading,
		uziPagination,
	} = usePatientProfileData(patientId)

	const uziColumns = useUziStudyColumns(deviceMap)

	const renderBody = () => {
		if (!patientId) {
			return (
				<Typography.Text type='danger'>
					Не указан идентификатор пациента (?id=)
				</Typography.Text>
			)
		}

		if (patientError && !patientLoading) {
			return (
				<Typography.Text type='danger'>
					Не удалось загрузить данные пациента. Проверьте, что бэкенд запущен и вы
					авторизованы.
				</Typography.Text>
			)
		}

		return (
			<PatientProfileView
				patient={patient}
				loading={loading}
				onBack={() => navigate('/patients')}
				backLabel='Пациенты'
			>
				<Space direction='vertical' size={16} style={{ width: '100%' }}>
					<Card
						styles={{ body: { padding: '16px 24px 24px' } }}
						title='Снимки'
						style={cardStyle}
						extra={
							<Button
								type='primary'
								disabled={!patientId}
								onClick={() =>
									navigate(`/upload_photo?patientId=${encodeURIComponent(patientId)}`)
								}
							>
								Добавить
							</Button>
						}
					>
						<Table<PatientUziStudyRow>
							rowKey='key'
							size='middle'
							tableLayout='fixed'
							style={{ width: '100%' }}
							columns={uziColumns}
							dataSource={uziRows}
							loading={uziLoading}
							pagination={uziPagination}
							locale={{ emptyText: 'Нет снимков' }}
						/>
					</Card>
				</Space>
			</PatientProfileView>
		)
	}

	return (
		<Layout style={{ minHeight: '100vh', background: 'transparent' }}>
			<Layout.Content
				style={{ padding: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}
			>
				{renderBody()}
			</Layout.Content>
		</Layout>
	)
}
