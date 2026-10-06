import React, { useContext, useEffect } from 'react'
import { Form, Input, Select } from 'antd'

import { ModalContext } from '@medml/ui'

import type { ICytologyInfoPatch, MaterialType } from '@cytology/core/types/cytology'

import { localizationOptions } from './localizationOptions'

const { TextArea } = Input

/**
 * Целое число из поля формы.
 *
 * `Input type='number'` отдаёт строку, а в спеке шлюза `calcitonin`,
 * `calcitonin_in_flush` и `thyroglobulin` — целые: и строку, и дробное
 * значение ogen отбивает как 400. Пустое поле считаем нулём.
 */
function toNumber(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'))
	return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

interface ConclusionModalProps {
	initData: ICytologyInfoPatch
	onSubmit?: (info: ICytologyInfoPatch) => void
}

interface ConclusionForm {
	materialType: MaterialType
	calcitonin: number
	thyroglobulin: number
	calcitoninFlush: number
	diagnosis: string
}

/** Заключение исследования: просмотр или правка для новой ревизии. */
const ConclusionModal: React.FC<ConclusionModalProps> = ({ initData, onSubmit }) => {
	const editable = onSubmit != null
	const { changeModalProps, close } = useContext(ModalContext)
	const [form] = Form.useForm<ConclusionForm>()

	const handleFinish = (values: ConclusionForm) => {
		const calcitonin = toNumber(values.calcitonin)
		const calcitoninFlush = toNumber(values.calcitoninFlush)
		const thyroglobulin = toNumber(values.thyroglobulin)
		const diagnosis = values.diagnosis ?? ''

		const changed =
			diagnosis !== initData.patient_card.diagnosis ||
			values.materialType !== initData.material_type ||
			calcitonin !== initData.calcitonin ||
			calcitoninFlush !== initData.calcitonin_in_flush ||
			thyroglobulin !== initData.thyroglobulin ||
			(initData.details &&
				(values.materialType !== initData.details.material_type ||
					calcitonin !== initData.details.calcitonin ||
					calcitoninFlush !== initData.details.calcitonin_in_flush ||
					thyroglobulin !== initData.details.thyroglobulin))
		if (!changed) return

		onSubmit?.({
			patient_card: {
				patient: initData.patient_card.patient,
				diagnosis,
			},
			// Номер исследования форма не правит, но шлюз требует его в запросе.
			diagnostic_number: initData.diagnostic_number,
			details: {
				material_type: values.materialType,
				calcitonin,
				calcitonin_in_flush: calcitoninFlush,
				thyroglobulin,
			},
			material_type: values.materialType,
			calcitonin,
			calcitonin_in_flush: calcitoninFlush,
			thyroglobulin,
		})
	}

	useEffect(() => {
		form.setFieldsValue({
			materialType: initData.material_type,
			calcitonin: initData.calcitonin,
			thyroglobulin: initData.thyroglobulin,
			calcitoninFlush: initData.calcitonin_in_flush,
			diagnosis: initData.patient_card.diagnosis,
		})
	}, [form, initData])

	useEffect(() => {
		changeModalProps({
			title: 'Заключение',
			footer: editable ? undefined : [],
			centered: true,
			width: '70%',
			okText: 'Подтвердить',
			onOk: () => {
				form.submit()
				close()
			},
			cancelText: 'Отменить',
		})
	}, [changeModalProps, close, editable, form])

	return (
		<Form layout='vertical' form={form} disabled={!editable} onFinish={handleFinish}>
			<Form.Item label='Локализация' name='materialType'>
				<Select options={localizationOptions} />
			</Form.Item>
			<Form.Item label='Кальцитонин' name='calcitonin'>
				<Input type='number' />
			</Form.Item>
			<Form.Item label='Тиреоглобулин в смыве' name='thyroglobulin'>
				<Input type='number' />
			</Form.Item>
			<Form.Item label='Кальцитонин в смыве' name='calcitoninFlush'>
				<Input type='number' />
			</Form.Item>
			<Form.Item label='Диагноз' name='diagnosis'>
				<TextArea rows={4} />
			</Form.Item>
		</Form>
	)
}

export default ConclusionModal
