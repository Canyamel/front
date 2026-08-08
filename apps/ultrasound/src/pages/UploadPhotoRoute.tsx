import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InboxOutlined } from '@ant-design/icons'
import { Card, Form, Layout, Space, Typography, Upload } from 'antd'

import { ConfigurableSplitUpload } from '@medml/ui'

import { StructuresPreview } from '@/features/uzi-view/structures'
import { useUziUpload } from './useUziUpload'

const { Dragger } = Upload

/**
 * Страница загрузки снимка — только композиция и разметка.
 * Справочники, схема полей, состояние файлов и сабмит живут в `useUziUpload`.
 */
export default function UploadPhotoRoute() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const presetPatientId = searchParams.get('patientId')?.trim() ?? ''
	const [form] = Form.useForm<Record<string, unknown>>()

	const {
		fields,
		file,
		uploadProps,
		structuresUploadProps,
		structuresData,
		initialValues,
		handleSubmit,
		pageBusy,
		isUploading,
	} = useUziUpload({
		presetPatientId,
		onUploaded: () => navigate('/patients'),
	})

	return (
		<Layout style={{ minHeight: '100vh', background: 'transparent' }}>
			<Layout.Content
				style={{ padding: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}
			>
				<Card style={{ borderRadius: 12 }}>
					<Space direction='vertical' size={14} style={{ width: '100%' }}>
						<Typography.Title level={2} style={{ margin: 0 }}>
							Загрузка снимка
						</Typography.Title>

						<Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
							Для начала диагностики загрузите снимок УЗИ щитовидной железы и укажите
							параметры слева.
						</Typography.Paragraph>

						<ConfigurableSplitUpload
							key={presetPatientId || 'upload-default'}
							form={form}
							fields={fields}
							initialValues={initialValues}
							file={file}
							requireFile
							onSubmit={handleSubmit}
							submitText='Начать диагностику'
							uploadSlot={
								<Dragger {...uploadProps} disabled={pageBusy || isUploading}>
									<p className='ant-upload-drag-icon'>
										<InboxOutlined />
									</p>
									<p className='ant-upload-text'>
										Нажмите или перетащите файл в эту область
									</p>
									<p className='ant-upload-hint'>Форматы: .png или .tiff</p>
								</Dragger>
							}
						/>

						<Typography.Paragraph style={{ marginBottom: 0, fontSize: '12px' }}>
							Загрузите JSON файл с предварительно размеченными структурами щитовидной
							железы. Это опционально и используется для демонстрации.
						</Typography.Paragraph>

						<Dragger {...structuresUploadProps} disabled={pageBusy}>
							<p className='ant-upload-drag-icon'>
								<InboxOutlined />
							</p>
							<p className='ant-upload-text'>Загрузить структуры ЩЖ (JSON)</p>
							<p className='ant-upload-hint'>Формат: JSON с координатами структур</p>
						</Dragger>

						{structuresData && (
							<>
								<Typography.Paragraph type='success' style={{ marginBottom: 0 }}>
									✓ Данные загружены ({structuresData.view_type})
								</Typography.Paragraph>
								<StructuresPreview
									structures={structuresData}
									width={500}
									height={350}
								/>
							</>
						)}
					</Space>
				</Card>
			</Layout.Content>
		</Layout>
	)
}
