// File: ./components/StudyDataSection.tsx
import React from 'react'
import {
	Form,
	Input,
	Select,
	Checkbox,
	Card,
	Divider,
	Button,
	Modal,
	theme,
} from 'antd'
import type { StudyDataSectionProps } from '@/features/thyroid-results/thyroidResultsTypes'
import { getSurfaceCardStyle } from '@/styles/uiPatterns'

const { Option } = Select

const StudyDataSection: React.FC<StudyDataSectionProps> = ({
	form,
	devices,
	modalVisible,
	setModalVisible,
	onSave,
	saving,
}) => {
	const { token } = theme.useToken()

	return (
		<>
			<Card
				title='Параметры исследования'
				size='small'
				style={getSurfaceCardStyle(token)}
				styles={{ body: { padding: 12 } }}
			>
				<Form.Item
					label='Аппарат'
					name='uziDevice'
					style={{ marginBottom: 10 }}
					rules={[{ required: true, message: 'Выберите аппарат' }]}
				>
					<Select placeholder='Выберите аппарат'>
						{devices.map(device => (
							<Option key={device.id} value={device.id}>
								{device.name}
							</Option>
						))}
					</Select>
				</Form.Item>

				<Form.Item
					label='Тип проекции'
					name='projectionType'
					style={{ marginBottom: 10 }}
				>
					<Select>
						<Option value='long'>Продольная</Option>
						<Option value='cross'>Поперечная</Option>
					</Select>
				</Form.Item>

				<Form.Item
					name='shortResult'
					valuePropName='checked'
					style={{ marginBottom: 12 }}
				>
					<Checkbox>Обнаружено новообразование</Checkbox>
				</Form.Item>

				<Button onClick={() => setModalVisible(true)}>
					Эхографические признаки
				</Button>
			</Card>

			<Modal
				title='Результаты диагностики'
				open={modalVisible}
				onCancel={() => setModalVisible(false)}
				footer={[
					<Button key='cancel' onClick={() => setModalVisible(false)}>
						Отмена
					</Button>,
					<Button key='submit' type='primary' loading={saving} onClick={onSave}>
						Сохранить
					</Button>,
				]}
			>
				<Form layout='vertical'>
					<Form.Item label='Контуры' name='profile'>
						<Input />
					</Form.Item>

					<Divider>Левая доля</Divider>
					<Form.Item label='Длина (см)' name='left_length'>
						<Input type='number' />
					</Form.Item>
					<Form.Item label='Ширина (см)' name='left_width'>
						<Input type='number' />
					</Form.Item>
					<Form.Item label='Толщина (см)' name='left_depth'>
						<Input type='number' />
					</Form.Item>

					<Divider>Правая доля</Divider>
					<Form.Item label='Длина (см)' name='right_length'>
						<Input type='number' />
					</Form.Item>
					<Form.Item label='Ширина (см)' name='right_width'>
						<Input type='number' />
					</Form.Item>
					<Form.Item label='Толщина (см)' name='right_depth'>
						<Input type='number' />
					</Form.Item>

					<Form.Item label='Объем железы (см³)' name='volume'>
						<Input type='number' />
					</Form.Item>
					<Form.Item label='Перешеек (см)' name='isthmus'>
						<Input type='number' />
					</Form.Item>
					<Form.Item label='Структура' name='structure'>
						<Input />
					</Form.Item>
					<Form.Item label='Эхогенность' name='echogenicity'>
						<Input />
					</Form.Item>
					<Form.Item label='Регионарные лимфатические узлы' name='rln'>
						<Input />
					</Form.Item>
					<Form.Item label='Васкуляризация по ЦДК' name='cdk'>
						<Input />
					</Form.Item>
					<Form.Item label='Расположение' name='position'>
						<Input />
					</Form.Item>
					<Form.Item label='Дополнительные данные' name='additional_data'>
						<Input.TextArea />
					</Form.Item>
					<Form.Item label='Заключение' name='diagnosis'>
						<Input.TextArea />
					</Form.Item>
				</Form>
			</Modal>
		</>
	)
}

export default StudyDataSection
