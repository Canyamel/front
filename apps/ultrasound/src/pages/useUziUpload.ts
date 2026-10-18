import * as React from 'react'
import { message, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { getFileExtension } from '@medml/shared'

import { isThyroidBackend } from '@/lib/apiBackend'
import {
	PROJECTION_OPTIONS,
	PROJECTION_SIDE_FIELD_LABEL,
	PROJECTION_SIDE_HINT,
	PROJECTION_SIDE_OPTIONS,
	needsProjectionSide,
} from '@/lib/projection'
import { useGetDoctorPatientsQuery } from '@/api/patientsApi'
import { useCreateUziDeviceMutation, useUploadUziDiagnosticMutation, useGetUziDevicesQuery } from '@/api/uziApi'
import { getRtkErrorMessage } from '@/lib/rtkErrorMessage'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import type { UploadSchemaField } from '@medml/ui'

function extractUploadedStudyId(response: unknown): string | null {
	if (!isThyroidBackend()) return null
	if (!response || typeof response !== 'object') return null
	const raw = (response as Record<string, unknown>).image_id
	if (typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')) {
		return String(raw)
	}
	return null
}

/** Форматы из макета: DICOM · TIF · JPG · PNG. */
const UPLOAD_EXTENSIONS = new Set(['dcm', 'dicom', 'tif', 'tiff', 'jpg', 'jpeg', 'png'])

const UNSUPPORTED_FILE_MESSAGE = 'Поддерживаются DICOM (в том числе без расширения), TIF, JPG и PNG'

/**
 * DICOM с аппаратов обычно приходит без расширения или с именем-UID
 * («1.2.840.113619.2.55», «IM0001.001») — такие имена пропускаем,
 * содержимое проверяет бэкенд.
 */
function isAllowedUploadName(name: string): boolean {
	const ext = getFileExtension(name)
	return ext === '' || UPLOAD_EXTENSIONS.has(ext) || /^\d+$/.test(ext)
}

/** Один файл в antd Upload. */
function singleFileList(file: File | null, uid: string): UploadFile[] {
	return file ? [{ uid, name: file.name, status: 'done', originFileObj: file } as UploadFile] : []
}

export const OTHER_DEVICE = '__other__'

export interface UseUziUploadOptions {
	presetPatientId: string
	projection?: string
	device?: string
	onUploaded: (studyId: string | null) => void
}

export function useUziUpload({ presetPatientId, projection, device, onUploaded }: UseUziUploadOptions) {
	const { doctorId, status } = useDoctorId()
	const [uploadUzi, { isLoading: isUploadingFile }] = useUploadUziDiagnosticMutation()
	const [createDevice, { isLoading: isCreatingDevice }] = useCreateUziDeviceMutation()
	const isUploading = isUploadingFile || isCreatingDevice
	// Добавлять аппараты умеет только Django-бэкенд (thyroid).
	const canAddDevice = isThyroidBackend()

	const { data: devices = [], isFetching: devicesLoading } = useGetUziDevicesQuery(undefined, {
		skip: status !== 'authenticated',
	})

	const { data: patientsData, isFetching: patientsLoading } = useGetDoctorPatientsQuery(
		{ doctorId, page: 1, pageSize: 500 },
		{ skip: !doctorId || status !== 'authenticated' },
	)

	const patients = patientsData?.rows ?? []

	const [file, setFile] = React.useState<File | null>(null)

	const fields = React.useMemo<UploadSchemaField[]>(() => {
		const deviceOptions = [
			...devices.map(d => ({ value: d.id, label: d.name })),
			...(canAddDevice ? [{ value: OTHER_DEVICE, label: 'Другое — ввести вручную' }] : []),
		]
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
				disabled: devicesLoading && devices.length === 0,
			},
			...(device === OTHER_DEVICE
				? [
						{
							name: 'deviceName',
							label: 'Название аппарата',
							type: 'input' as const,
							required: true,
							placeholder: 'Например, Canon Aplio i800',
							tooltip: 'Аппарат добавится в список и будет доступен при следующих загрузках',
						},
					]
				: []),
			{
				name: 'projection',
				label: 'Проекция',
				type: 'select',
				required: true,
				placeholder: 'Выберите проекцию',
				options: PROJECTION_OPTIONS,
			},
		]

		// Доля идёт сразу за проекцией и до выбора пациента — то есть до того,
		// как врач приложит файл: от неё зависит, какая модель сегментации
		// структур ЩЖ отработает по снимку.
		if (needsProjectionSide(projection)) {
			result.push({
				name: 'projectionSide',
				label: PROJECTION_SIDE_FIELD_LABEL,
				type: 'select',
				required: true,
				placeholder: 'Выберите долю',
				options: PROJECTION_SIDE_OPTIONS,
				tooltip: PROJECTION_SIDE_HINT,
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
	}, [devices, devicesLoading, canAddDevice, device, patients, patientsLoading, projection])

	const uploadProps: UploadProps = React.useMemo(
		() => ({
			name: 'file',
			multiple: false,
			// `accept` намеренно не задан: браузер спрятал бы в диалоге выбора
			// DICOM без расширения, а именно так их отдают аппараты УЗИ.
			maxCount: 1,
			beforeUpload: next => {
				if (!isAllowedUploadName(next.name)) {
					message.error(UNSUPPORTED_FILE_MESSAGE)
					return Upload.LIST_IGNORE
				}
				setFile(next as File)
				return false
			},
			onRemove: () => setFile(null),
			fileList: singleFileList(file, 'uzi-file'),
		}),
		[file],
	)

	/**
	 * id аппарата для загрузки. «Другое» — аппарат из ручного ввода: уже
	 * известный по названию берём из списка, новый сначала добавляем.
	 */
	const resolveDeviceId = React.useCallback(
		async (values: Record<string, unknown>): Promise<string | null> => {
			if (values.device !== OTHER_DEVICE) return String(values.device ?? '')

			const name = String(values.deviceName ?? '')
				.split(/\s+/)
				.filter(Boolean)
				.join(' ')
			if (!name) {
				message.error('Введите название аппарата')
				return null
			}
			const known = devices.find(d => d.name.trim().toLowerCase() === name.toLowerCase())
			if (known) return known.id

			try {
				const created = await createDevice(name).unwrap()
				message.success(`Аппарат «${created.name}» добавлен`)
				return created.id
			} catch (e) {
				message.error(`Не удалось добавить аппарат: ${getRtkErrorMessage(e)}`)
				return null
			}
		},
		[createDevice, devices],
	)

	const handleSubmit = React.useCallback(
		async ({ values }: { values: Record<string, unknown> }) => {
			if (!file) {
				message.error('Выберите файл для загрузки')
				return
			}

			// Долю отправляем только с продольной проекцией. Скрытое поле antd
			// не забывает: если врач выбрал долю, а потом переключился на
			// поперечную, значение осталось бы в форме и уехало на сервер.
			const projectionValue = String(values.projection ?? '')
			const projectionSide =
				needsProjectionSide(projectionValue) && values.projectionSide ? String(values.projectionSide) : undefined

			try {
				const deviceId = await resolveDeviceId(values)
				if (!deviceId) return

				const response = await uploadUzi({
					file,
					projection: projectionValue,
					patientRefId: String(values.patient ?? ''),
					deviceId,
					...(projectionSide ? { projectionSide } : {}),
				}).unwrap()

				message.success('Снимок обработан')
				onUploaded(extractUploadedStudyId(response))
			} catch (e) {
				console.error('Загрузка снимка УЗИ:', getRtkErrorMessage(e), e)
			}
		},
		[file, onUploaded, uploadUzi, resolveDeviceId],
	)

	const initialValues = React.useMemo(() => {
		if (!presetPatientId) return undefined
		const row = patients.find(p => String(p.id) === presetPatientId)
		if (!row) return undefined
		const value = isThyroidBackend() ? row.patientCardId : row.id
		return value ? { patient: String(value) } : undefined
	}, [presetPatientId, patients])

	const pageBusy = status === 'authenticated' && (!doctorId || devicesLoading || patientsLoading)

	return {
		fields,
		file,
		uploadProps,
		initialValues,
		handleSubmit,
		pageBusy,
		isUploading,
	}
}
