import { useContext, useEffect } from 'react'
import { Form, Select } from 'antd'

import { ModalContext } from '@medml/ui'
import { segmentsTranslated, SegmentType } from '@cytology/core/types/segments'

type AddSegmentTypeForm = {
	type: SegmentType
}

interface AddSegmentTypeModalProps {
	options: SegmentType[]
	onSubmit: (type: SegmentType) => void
}

/** Выбор типа сегментов, которых на снимке ещё нет, — в него врач будет рисовать. */
const AddSegmentTypeModal: React.FC<AddSegmentTypeModalProps> = ({ options, onSubmit }) => {
	const [form] = Form.useForm<AddSegmentTypeForm>()
	const { close, changeModalProps } = useContext(ModalContext)

	useEffect(() => {
		changeModalProps({
			title: 'Добавление нового типа сегментов',
			cancelText: 'Отменить',
			okText: 'Добавить',
			centered: true,
			onOk: form.submit,
		})
	}, [changeModalProps, form])

	const handleFinish = (values: AddSegmentTypeForm) => {
		onSubmit(values.type)
		close()
	}

	return (
		<Form form={form} layout='horizontal' onFinish={handleFinish}>
			<Form.Item required name='type'>
				<Select
					placeholder='Выберите тип сегмента'
					options={options.map(segType => ({
						value: segType,
						label: `${segmentsTranslated[segType]} ${segType}`,
					}))}
				/>
			</Form.Item>
		</Form>
	)
}

export default AddSegmentTypeModal
