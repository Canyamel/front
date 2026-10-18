import * as React from 'react'
import { EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Dropdown, Input, Table, Tag, Tooltip, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { PatientCreateModal, stripPolicyDigits, type PatientCreateValuesCytology } from '@medml/patient_create'
import { PatientProfileView } from '@medml/patient_view'
import { NotFoundPage, PageShell } from '@medml/layout'
import { isNotFoundError } from '@medml/shared'

import { goMissingEndpoints } from '@/lib/cytologyRoutes'
import { useCurrentDoctor } from '@/lib/useCurrentDoctor'
import {
	useGetPatientShotsByCardIdQuery,
	useUpdatePatientCardMutation,
	type CytologyStudyRow,
} from '@/lib/patientProfileApi'

const { Search } = Input

const AI_FILTER_VALUES = { processed: 'processed', pending: 'pending', unknown: 'unknown' } as const

function aiFilterKey(value: boolean | null): string {
	if (value === true) return AI_FILTER_VALUES.processed
	if (value === false) return AI_FILTER_VALUES.pending
	return AI_FILTER_VALUES.unknown
}

function AiProcessedTag({ value }: { value: boolean | null }) {
	if (value === true) return <Tag color='green'>Обработан ИИ</Tag>
	if (value === false) return <Tag color='gold'>Ожидает ИИ</Tag>
	return (
		<Tooltip title='Сервер пока не присылает признак обработки ИИ'>
			<Typography.Text type='secondary'>—</Typography.Text>
		</Tooltip>
	)
}

function useStudyColumns(): ColumnsType<CytologyStudyRow> {
	return React.useMemo(
		() => [
			{
				title: 'Дата забора',
				dataIndex: 'cytologyDateLabel',
				key: 'cytologyDateLabel',
				width: '14%',
				sorter: (a, b) => a.cytologyDateSort - b.cytologyDateSort,
			},
			{
				title: 'Номер исследования',
				dataIndex: 'numberLabel',
				key: 'numberLabel',
				width: '18%',
			},
			{
				title: 'Локализация',
				dataIndex: 'materialTypeLabel',
				key: 'materialTypeLabel',
				width: '20%',
			},
			{
				title: 'Категория',
				dataIndex: 'bethesdaLabel',
				key: 'bethesdaLabel',
				width: '14%',
			},
			{
				title: 'ИИ',
				dataIndex: 'aiProcessed',
				key: 'aiProcessed',
				width: '14%',
				filters: [
					{ text: 'Обработан ИИ', value: AI_FILTER_VALUES.processed },
					{ text: 'Ожидает ИИ', value: AI_FILTER_VALUES.pending },
					{ text: 'Нет данных', value: AI_FILTER_VALUES.unknown },
				],
				onFilter: (value, row) => aiFilterKey(row.aiProcessed) === value,
				render: (_value, row) => <AiProcessedTag value={row.aiProcessed} />,
			},
			{
				title: '',
				key: 'action',
				width: '10%',
				align: 'center',
				render: (_value, row) => {
					const items: MenuProps['items'] = [
						{
							key: 'result',
							label: (
								<Link to={`/cytology/${encodeURIComponent(row.id)}`} style={{ fontWeight: 500 }}>
									Результат
								</Link>
							),
						},
					]
					return (
						<Dropdown menu={{ items }} trigger={['click']}>
							<Button type='text' icon={<MoreOutlined />} aria-label='Действия' />
						</Dropdown>
					)
				},
			},
		],
		[],
	)
}

export default function PatientProfileRoute() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const cardId = params.get('id')?.trim() ?? ''
	// Заполняется списком пациентов; нужен Go-ручке `/cytology/patient/{id}/shots`.
	const patientId = params.get('patient')?.trim() || undefined

	const [search, setSearch] = React.useState('')
	const [editOpen, setEditOpen] = React.useState(false)
	const [studyPage, setStudyPage] = React.useState(1)
	const [studyPageSize, setStudyPageSize] = React.useState(10)

	const { data, error, isFetching, isLoading } = useGetPatientShotsByCardIdQuery(
		{ cardId, patientId },
		{ skip: !cardId },
	)

	const [updatePatientCard, { isLoading: isUpdating }] = useUpdatePatientCardMutation()
	const { shortName: attendingDoctor } = useCurrentDoctor()

	const patient = data?.patient ?? null

	const editDefaults = data?.editDefaults
	const patientDiagnosis = data?.patient?.diagnosis

	// Здесь же дата превращается в Dayjs: в кэше RTK Query она лежит строкой
	const editInitialValues = React.useMemo<PatientCreateValuesCytology | undefined>(() => {
		if (!editDefaults) return undefined
		const diagnosis = editDefaults.diagnosis ?? patientDiagnosis ?? ''
		return {
			...editDefaults,
			birthDate: editDefaults.birthDate ? dayjs(editDefaults.birthDate) : dayjs(),
			diagnosis: diagnosis === 'Не обнаружено' ? '' : diagnosis,
		}
	}, [editDefaults, patientDiagnosis])

	const studyColumns = useStudyColumns()

	const filteredStudies = React.useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return data?.studies ?? []
		return (data?.studies ?? []).filter(
			row =>
				row.numberLabel.toLowerCase().includes(q) ||
				row.materialTypeLabel.toLowerCase().includes(q) ||
				row.bethesdaLabel.toLowerCase().includes(q) ||
				row.cytologyDateLabel.toLowerCase().includes(q),
		)
	}, [data?.studies, search])

	React.useEffect(() => {
		setStudyPage(1)
	}, [search, cardId])

	const handleEditFinish = async (values: PatientCreateValuesCytology) => {
		if (!cardId) return
		try {
			await updatePatientCard({
				cardId,
				payload: {
					patient: {
						first_name: values.firstName.trim(),
						last_name: values.lastName.trim(),
						fathers_name: (values.fathersName ?? '').trim(),
						personal_policy: stripPolicyDigits(values.personalPolicy),
						email: values.email.trim(),
						...(values.active ? { is_active: true } : {}),
						birth_date: dayjs(values.birthDate).format('YYYY-MM-DD'),
					},
					card: {
						diagnosis: values.diagnosis?.trim() ?? '',
					},
				},
			}).unwrap()
			message.success('Карта пациента обновлена')
			setEditOpen(false)
		} catch {
			message.error('Не удалось сохранить изменения')
		}
	}

	// В Go-шлюзе правки разнесены по двум ручкам и вместе не покрывают форму:
	// `/med/patient/{id}` меняет только `active` и `malignancy`,
	// `/med/card/{doctor_id}/{patient_id}` — только диагноз.
	const canEditPatient = !goMissingEndpoints.patientCardUpdate()

	const loading = isLoading || isFetching

	const patientNotFound =
		!cardId || isNotFoundError(error) || (!loading && !error && data != null && data.patient == null)

	if (patientNotFound) {
		return (
			<NotFoundPage
				title='Пациент не найден'
				description='Карта пациента удалена или ссылка неверна. Вернитесь к списку пациентов.'
				homePath='/patients'
			/>
		)
	}

	return (
		<PageShell>
			{!cardId ? (
				<Typography.Text type='danger'>Не указан идентификатор карты (?id=)</Typography.Text>
			) : (
				<>
					<PatientProfileView
						patient={patient}
						loading={loading}
						attendingDoctor={attendingDoctor}
						actions={
							<>
								{canEditPatient ? (
									<Button icon={<EditOutlined />} onClick={() => setEditOpen(true)} disabled={!patient}>
										Редактировать
									</Button>
								) : null}
								<Button
									type='primary'
									icon={<PlusOutlined />}
									onClick={() => navigate(`/upload_photo?patientId=${encodeURIComponent(cardId)}`)}
								>
									Добавить снимок
								</Button>
							</>
						}
					>
						<Card
							title='Цитологические исследования'
							style={{ width: '100%' }}
							extra={
								<Search
									allowClear
									placeholder='Поиск диагностики'
									value={search}
									onChange={e => setSearch(e.target.value)}
									style={{ width: 280 }}
								/>
							}
						>
							<Table<CytologyStudyRow>
								rowKey='id'
								size='middle'
								columns={studyColumns}
								dataSource={filteredStudies}
								loading={loading}
								locale={{ emptyText: 'Нет исследований' }}
								pagination={{
									current: studyPage,
									pageSize: studyPageSize,
									total: filteredStudies.length,
									showSizeChanger: true,
									pageSizeOptions: [10, 20, 50],
									onChange: (page, size) => {
										setStudyPage(page)
										if (size) setStudyPageSize(size)
									},
								}}
							/>
						</Card>
					</PatientProfileView>

					<PatientCreateModal
						open={editOpen}
						title='Редактирование карты'
						okText='Сохранить'
						variant='cytology'
						initialValues={editInitialValues}
						confirmLoading={isUpdating}
						onCancel={() => setEditOpen(false)}
						onFinish={vals => void handleEditFinish(vals as PatientCreateValuesCytology)}
					/>
				</>
			)}
		</PageShell>
	)
}
