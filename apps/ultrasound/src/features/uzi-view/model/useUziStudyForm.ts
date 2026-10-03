import { useCallback, useEffect, useRef, useState } from 'react'
import { Form, message } from 'antd'
import type { FormInstance } from 'antd'
import { useUpdateThyroidUziDataMutation } from '@/api/uziApi'
import type { ThyroidUziApiResponse, UziDeviceInfo } from '../model/types'
import { PROJECTION_LONG, needsProjectionSide } from '@/lib/projection'
import { readThyroidDimensions, toLegacyDetails, type ThyroidDimensionsMm } from './thyroidDimensions'

const TEXT_DETAIL_FIELDS = [
	'profile',
	'cdk',
	'echogenicity',
	'position',
	'structure',
	'rln',
	'result',
	'additional_data',
] as const

export interface UseUziStudyFormOptions {
	uziId: string
	data: ThyroidUziApiResponse | undefined
	devices: UziDeviceInfo[] | undefined
}

export interface UseUziStudyFormResult {
	form: FormInstance
	saving: boolean
	modalVisible: boolean
	setModalVisible: (visible: boolean) => void
	handleSave: () => Promise<void>
}

/**
 * Синхронизация формы параметров исследования с ответом API и её сохранение.
 */
export function useUziStudyForm({ uziId, data, devices }: UseUziStudyFormOptions): UseUziStudyFormResult {
	const [form] = Form.useForm()
	const [saving, setSaving] = useState(false)
	const [modalVisible, setModalVisible] = useState(false)
	const [updateUzi] = useUpdateThyroidUziDataMutation()
	// Размеры в том виде, в каком они пришли с бэкенда, — чтобы при
	// сохранении отправить только изменённые.
	const initialDimensionsRef = useRef<ThyroidDimensionsMm>(readThyroidDimensions(undefined))

	useEffect(() => {
		if (!data || !devices) return

		const { details } = data.info
		// Размеры ЩЖ в форме — всегда миллиметры под каноническими именами
		// (`right_lobe_length`, …), см. `thyroidDimensions.ts`.
		const dimensions = readThyroidDimensions(details as unknown as Record<string, unknown>)
		initialDimensionsRef.current = dimensions
		form.setFieldsValue({
			uziDevice: devices.find(d => d.name === data.info.uzi_device_name)?.id ?? null,
			projectionType: details.projection_type || PROJECTION_LONG,
			projectionSide: needsProjectionSide(details.projection_type || PROJECTION_LONG)
				? (details.anatomy_side ?? details.projection_side ?? undefined)
				: undefined,
			shortResult: data.info.has_nodules === 'T',
			diagnosis: data.info.diagnosis,
			cdk: details.cdk,
			echogenicity: details.echogenicity,
			...dimensions,
			position: details.position,
			profile: details.profile,
			result: details.result,
			rln: details.rln,
			structure: details.structure,
			additional_data: details.additional_data,
		})
	}, [data, devices, form])

	const handleSave = useCallback(async () => {
		setSaving(true)
		try {
			await form.validateFields()
			// Всё хранилище формы, а не только смонтированные поля: размеры
			// живут в модалке «Эхографические признаки», которая до первого
			// открытия не рендерит свои Form.Item.
			const values = form.getFieldsValue(true) as Record<string, unknown>

			const textDetails: Record<string, string> = {}
			for (const field of TEXT_DETAIL_FIELDS) {
				const value = values[field]
				if (typeof value === 'string' && value.trim()) textDetails[field] = value
			}

			await updateUzi({
				uziId,
				data: {
					patient_card: {
						patient: data?.info.patient.id,
						has_nodules: values.shortResult ? 'T' : 'F',
						diagnosis: values.diagnosis,
					},
					acceptance_datetime: data?.info.diagnos_date,
					details: {
						...textDetails,
						// Ручка сохранения принимает только legacy-поля (см):
						// `*_lobe_*` она выбрасывает.
						...toLegacyDetails(values, initialDimensionsRef.current),
						projection_type: values.projectionType,
						anatomy_side: needsProjectionSide(values.projectionType as string | undefined)
							? (values.projectionSide ?? null)
							: null,
						nodule_type: [],
						ai_info: [],
					},
					uzi_device: values.uziDevice,
				},
			}).unwrap()

			// Перечитывать снимок вручную не нужно: мутация инвалидирует
			// тег Uzi, и RTK Query обновит данные сам.
			message.success('Результат сохранен!')
			setModalVisible(false)
		} catch (saveError) {
			console.error('Error saving:', saveError)
			message.error('Ошибка при сохранении')
		} finally {
			setSaving(false)
		}
	}, [data, form, updateUzi, uziId])

	return { form, saving, modalVisible, setModalVisible, handleSave }
}
