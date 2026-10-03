import React, { useContext, useEffect } from 'react'
import { Form, Input, Select } from 'antd'

import { ModalContext } from '@medml/ui'

import type { ICytologyInfoPatch, MaterialType } from '@cytology/core/types/cytology'

import { localizationOptions } from './localizationOptions'

const { TextArea } = Input

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
		const changed =
			values.diagnosis !== initData.patient_card.diagnosis ||
			values.materialType !== initData.material_type ||
			values.calcitonin !== initData.calcitonin ||
			values.calcitoninFlush !== initData.calcitonin_in_flush ||
			values.thyroglobulin !== initData.thyroglobulin ||
			(initData.details &&
				(values.materialType !== initData.details.material_type ||
					values.calcitonin !== initData.details.calcitonin ||
					values.calcitoninFlush !== initData.details.calcitonin_in_flush ||
					values.thyroglobulin !== initData.details.thyroglobulin))
		if (!changed) return

		onSubmit?.({
			patient_card: {
				patient: initData.patient_card.patient,
				diagnosis: values.diagnosis,
			},
			details: {
				material_type: values.materialType,
				calcitonin: values.calcitonin,
				calcitonin_in_flush: values.calcitoninFlush,
				thyroglobulin: values.thyroglobulin,
			},
			material_type: values.materialType,
			calcitonin: values.calcitonin,
			calcitonin_in_flush: values.calcitoninFlush,
			thyroglobulin: values.thyroglobulin,
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
		// `ModalWrapper` пересоздаёт `changeModalProps` и `close` на каждом
		// рендере, а `changeModalProps` сам его вызывает: с ними в зависимостях
		// эффект зациклится.
	}, [editable, form])

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
