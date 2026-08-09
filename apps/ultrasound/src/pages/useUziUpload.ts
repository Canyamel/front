import * as React from 'react'
import { message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'

import { isThyroidBackend } from '@/lib/apiBackend'
import { useGetDoctorPatientsQuery } from '@/api/patientsApi'
import { useUploadUziDiagnosticMutation, useGetUziDevicesQuery } from '@/api/uziApi'
import { getRtkErrorMessage } from '@/lib/rtkErrorMessage'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import type { UploadSchemaField } from '@medml/ui'

/** Один файл в antd Upload. */
function singleFileList(file: File | null, uid: string): UploadFile[] {
	return file
		? [{ uid, name: file.name, status: 'done', originFileObj: file } as UploadFile]
		: []
}

export interface UseUziUploadOptions {
	presetPatientId: string
	onUploaded: () => void
}

/**
 * Логика страницы загрузки снимка: справочники (аппараты/пациенты),
 * схема полей формы, состояние файла и отправка на диагностику.
 *
 * Вынесено из `UploadPhotoRoute`, который смешивал это всё с версткой.
 */
export function useUziUpload({ presetPatientId, onUploaded }: UseUziUploadOptions) {
	const { doctorId, status } = useDoctorId()
	const [uploadUzi, { isLoading: isUploading }] = useUploadUziDiagnosticMutation()

	const { data: devices = [], isFetching: devicesLoading } = useGetUziDevicesQuery(
		undefined,
		{ skip: status !== 'authenticated' },
	)

	const { data: patientsData, isFetching: patientsLoading } =
		useGetDoctorPatientsQuery(
			{ doctorId, page: 1, pageSize: 500 },
			{ skip: !doctorId || status !== 'authenticated' },
		)

	const patients = patientsData?.rows ?? []

	const [file, setFile] = React.useState<File | null>(null)
	const [projectionValue, setProjectionValue] = React.useState<string | undefined>()

	const fields = React.useMemo<UploadSchemaField[]>(() => {
		const deviceOptions = devices.map(d => ({ value: d.id, label: d.name }))
		const patientOptions = patients
			.filter(p => (isThyroidBackend() ? p.patientCardId : p.id))
			.map(p => ({
				value: String(isThyroidBackend() ? p.patientCardId : p.id),
				label: `${p.fullName}${p.policyNumber ? ` — ${p.policyNumber}` : ''}`,
			}))

		const result: UploadSchemaField[] = [
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
			result.push({
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

		result.push({
			name: 'patient',
			label: 'Пациент',
			type: 'select',
			required: true,
			placeholder: 'Выберите пациента',
			options: patientOptions,
			disabled: patientsLoading && patientOptions.length === 0,
		})

		return result
	}, [devices, devicesLoading, patients, patientsLoading, projectionValue])

	const uploadProps: UploadProps = React.useMemo(
		() => ({
			name: 'file',
			multiple: false,
			// Форматы из макета: DICOM · TIF · JPG · PNG.
			accept: '.dcm,.dicom,.tif,.tiff,.jpg,.jpeg,.png',
			maxCount: 1,
			beforeUpload: next => {
				setFile(next as File)
				return false
			},
			onRemove: () => setFile(null),
			fileList: singleFileList(file, 'uzi-file'),
		}),
		[file],
	)

	const handleSubmit = React.useCallback(
		async ({ values }: { values: Record<string, unknown> }) => {
			if (!file) {
				message.error('Выберите файл для загрузки')
				return
			}

			const projectionSide = values.projectionSide
				? String(values.projectionSide)
				: undefined

			try {
				await uploadUzi({
					file,
					projection: String(values.projection ?? ''),
					patientRefId: String(values.patient ?? ''),
					deviceId: String(values.device ?? ''),
					...(projectionSide ? { projectionSide } : {}),
				}).unwrap()

				message.success('Снимок отправлен на диагностику')
				onUploaded()
			} catch (e) {
				message.error(getRtkErrorMessage(e))
				console.error(e)
			}
		},
		[file, onUploaded, uploadUzi],
	)

	const initialValues = React.useMemo(() => {
		if (!presetPatientId) return undefined
		const row = patients.find(p => String(p.id) === presetPatientId)
		if (!row) return undefined
		const value = isThyroidBackend() ? row.patientCardId : row.id
		return value ? { patient: String(value) } : undefined
	}, [presetPatientId, patients])

	const pageBusy =
		status === 'authenticated' && (!doctorId || devicesLoading || patientsLoading)

	return {
		fields,
		file,
		uploadProps,
		initialValues,
		handleSubmit,
		setProjectionValue,
		pageBusy,
		isUploading,
	}
}
