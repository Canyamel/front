import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InboxOutlined } from '@ant-design/icons'
import { Card, Form, Layout, Space, Typography, Upload, message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'

import { ConfigurableSplitUpload, type UploadSchemaField } from '@medml/ui'

import { isThyroidBackend } from '@/lib/apiBackend'
import { useGetDoctorPatientsQuery } from '@/api/patientsApi'
import { useUploadUziDiagnosticMutation, useGetUziDevicesQuery } from '@/api/uziApi'
import { getRtkErrorMessage } from '@/lib/rtkErrorMessage'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import {
	loadThyroidStructuresFromJson,
	type ThyroidStructureJson,
} from '@/features/thyroid-results/demoThyroidStructures'
import { saveThyroidStructures } from '@/lib/structuresStorage'
import ThyroidStructuresPreview from '@/components/ThyroidStructuresPreview'

const { Dragger } = Upload

export default function UploadPhotoRoute() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const presetPatientId = searchParams.get('patientId')?.trim() ?? ''
	const { doctorId, status } = useDoctorId()
	const [uploadUzi, { isLoading: isUploading }] = useUploadUziDiagnosticMutation()

	const { data: devices = [], isFetching: devicesLoading } = useGetUziDevicesQuery(undefined, {
		skip: status !== 'authenticated',
	})

	const { data: patientsData, isFetching: patientsLoading } = useGetDoctorPatientsQuery(
		{ doctorId, page: 1, pageSize: 500 },
		{ skip: !doctorId || status !== 'authenticated' },
	)

	const patients = patientsData?.rows ?? []

	const [file, setFile] = React.useState<File | null>(null)
	const [structuresFile, setStructuresFile] = React.useState<File | null>(null)
	const [structuresData, setStructuresData] = React.useState<ThyroidStructureJson | null>(null)
	const [projectionValue, setProjectionValue] = React.useState<string | undefined>(undefined)
	const [form] = Form.useForm<Record<string, unknown>>()

	const fields = React.useMemo<UploadSchemaField[]>(() => {
		const deviceOptions = devices.map(d => ({ value: d.id, label: d.name }))
		const patientOptions = patients
			.filter(p => (isThyroidBackend() ? p.patientCardId : p.id))
			.map(p => ({
				value: String(isThyroidBackend() ? p.patientCardId : p.id),
				label: `${p.fullName}${p.policyNumber ? ` — ${p.policyNumber}` : ''}`,
			}))

		const fields: UploadSchemaField[] = [
			{
				name: 'device',
				label: 'Аппарат',
				type: 'select',
				required: true,
				placeholder: 'Выберите аппарат',
				options: deviceOptions,
				disabled: devicesLoading && deviceOptions.length === 0,
			},
			{
				name: 'projection',
				label: 'Проекция',
				type: 'select',
				required: true,
				placeholder: 'Выберите проекцию',
				options: [
					{ value: 'long', label: 'Продольная' },
					{ value: 'cross', label: 'Поперечная' },
				],
			},
		]

		if (projectionValue === 'long') {
			fields.push({
				name: 'projectionSide',
				label: 'Сторона доли',
				type: 'select',
				required: true,
				placeholder: 'Выберите долю',
				options: [
					{ value: 'left', label: 'Левая доля' },
					{ value: 'right', label: 'Правая доля' },
				],
			})
		}

		fields.push({
			name: 'patient',
			label: 'Пациент',
			type: 'select',
			required: true,
			placeholder: 'Выберите пациента',
			options: patientOptions,
			disabled: patientsLoading && patientOptions.length === 0,
		})

		return fields
	}, [devices, devicesLoading, patients, patientsLoading, projectionValue])

	const uploadProps: UploadProps = React.useMemo(
		() => ({
			name: 'file',
			multiple: false,
			accept: '.png,.tiff',
			maxCount: 1,
			beforeUpload: next => {
				setFile(next as File)
				return false
			},
			onRemove: () => {
				setFile(null)
			},
			fileList: file
				? [
						{
							uid: 'uzi-file',
							name: file.name,
							status: 'done',
							originFileObj: file,
						} as UploadFile,
					]
				: [],
		}),
		[file],
	)

	const structuresUploadProps: UploadProps = React.useMemo(
		() => ({
			name: 'structures-file',
			multiple: false,
			accept: '.json',
			maxCount: 1,
			beforeUpload: async next => {
				setStructuresFile(next as File)
				// Загружаем и валидируем JSON
				const data = await loadThyroidStructuresFromJson(next as File)
				if (data) {
					setStructuresData(data)
					message.success('Структуры ЩЖ загружены успешно')
				} else {
					message.error('Неверный формат JSON файла')
					setStructuresFile(null)
					setStructuresData(null)
				}
				return false
			},
			onRemove: () => {
				setStructuresFile(null)
				setStructuresData(null)
			},
			fileList: structuresFile
				? [
						{
							uid: 'structures-file',
							name: structuresFile.name,
							status: 'done',
							originFileObj: structuresFile,
						} as UploadFile,
					]
				: [],
		}),
		[structuresFile],
	)

	const handleSubmit = async ({ values }: { values: Record<string, unknown> }) => {
		if (!file) {
			message.error('Выберите файл для загрузки')
			return
		}
		const projection = String(values.projection ?? '')
		const patientRefId = String(values.patient ?? '')
		const deviceId = String(values.device ?? '')
		const projectionSide = values.projectionSide ? String(values.projectionSide) : undefined

		try {
			const result = await uploadUzi({
				file,
				projection,
				patientRefId,
				deviceId,
				...(projectionSide ? { projectionSide } : {}),
			}).unwrap()

			// Сохраняем структуры ЩЖ если они были загружены
			if (structuresData && result && typeof result === 'object' && 'id' in result) {
				const imageid = (result as Record<string, any>).id
				if (imageid) {
					saveThyroidStructures(imageid, structuresData)
				}
			}

			message.success('Снимок отправлен на диагностику')
			navigate('/patients')
		} catch (e) {
			message.error(getRtkErrorMessage(e))
			console.error(e)
		}
	}

	const pageBusy = status === 'authenticated' && (!doctorId || devicesLoading || patientsLoading)

	const uploadInitialValues = React.useMemo(() => {
		if (!presetPatientId) return undefined
		const row = patients.find(p => String(p.id) === presetPatientId)
		if (!row) return undefined
		const value = isThyroidBackend() ? row.patientCardId : row.id
		return value ? { patient: String(value) } : undefined
	}, [presetPatientId, patients])

	return (
		<Layout style={{ minHeight: '100vh', background: 'transparent' }}>
			<Layout.Content style={{ padding: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}>
				<Card style={{ borderRadius: 12 }}>
					<Space direction='vertical' size={14} style={{ width: '100%' }}>
						<Typography.Title level={2} style={{ margin: 0 }}>
							Загрузка снимка
						</Typography.Title>

						<Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
							Для начала диагностики загрузите снимок УЗИ щитовидной железы и укажите параметры слева.
						</Typography.Paragraph>

						<ConfigurableSplitUpload
							key={presetPatientId || 'upload-default'}
							form={form}
							fields={fields}
							initialValues={uploadInitialValues}
							file={file}
							requireFile
							onSubmit={handleSubmit}
							submitText='Начать диагностику'
							uploadSlot={
								<Dragger {...uploadProps} disabled={pageBusy || isUploading}>
									<p className='ant-upload-drag-icon'>
										<InboxOutlined />
									</p>
									<p className='ant-upload-text'>Нажмите или перетащите файл в эту область</p>
									<p className='ant-upload-hint'>Форматы: .png или .tiff</p>
								</Dragger>
							}
						/>
						<Typography.Paragraph style={{ marginBottom: 0, fontSize: '12px' }}>
							Загрузите JSON файл с предварительно размеченными структурами щитовидной железы. Это опционально и
							используется для демонстрации.
						</Typography.Paragraph>
						<Dragger {...structuresUploadProps} disabled={pageBusy}>
							<p className='ant-upload-drag-icon'>
								<InboxOutlined />
							</p>
							<p className='ant-upload-text'>Загрузить структуры ЩЖ (JSON)</p>
							<p className='ant-upload-hint'>Формат: JSON с координатами структур</p>
						</Dragger>
						{structuresData && (
							<Typography.Paragraph type='success' style={{ marginBottom: 0 }}>
								✓ Данные загружены ({structuresData.view_type})
							</Typography.Paragraph>
						)}
						{structuresData && <ThyroidStructuresPreview structures={structuresData} width={500} height={350} />}
					</Space>
				</Card>
			</Layout.Content>
		</Layout>
	)
}
