import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Button, Col, Divider, Form, Input, Modal, Row, Space, Switch, Typography } from 'antd'
import type { FormInstance } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'

import type { DoctorProfile } from '@/api/doctorApi'
import type { ThyroidUziApiResponse } from '@/features/uzi-view/model/types'
import { MISSING_SCALE_WARNING } from '@/features/uzi-view/model/thyroidDimensions'

import { buildReportModel, needsScaleCalibration } from '../model/buildReportModel'
import type { ReportExtras } from '../model/types'
import { renderReportHtml } from './reportHtml'
import { useDebouncedValue } from './useDebouncedValue'

const { Text, Title } = Typography

export interface ReportModalProps {
	open: boolean
	onClose: () => void
	data: ThyroidUziApiResponse
	form: FormInstance
	doctor?: DoctorProfile
	patientBirthDate?: string
	extras: ReportExtras
	onExtrasChange: (next: ReportExtras) => void
	pxPerMm?: number | null
}

/** Подпись + контрол в одну колонку; без Form.Item, чтобы не плодить формы. */
const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
	<div style={{ marginBottom: 12 }}>
		<Text style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>{label}</Text>
		{children}
		{hint && (
			<Text type='secondary' style={{ display: 'block', marginTop: 2, fontSize: 11 }}>
				{hint}
			</Text>
		)}
	</div>
)

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<Divider orientation='left' style={{ margin: '4px 0 12px' }}>
		<Title level={5} style={{ margin: 0, fontSize: 13 }}>
			{children}
		</Title>
	</Divider>
)

/**
 * Заполнение и предпросмотр печатного заключения.
 */
const ReportModal: React.FC<ReportModalProps> = ({
	open,
	onClose,
	data,
	form,
	doctor,
	patientBirthDate,
	extras,
	onExtrasChange,
	pxPerMm,
}) => {
	const frameRef = useRef<HTMLIFrameElement>(null)
	const [showPreview, setShowPreview] = useState(true)

	// Значения формы читаем из стора: их меняет и этот диалог, и модалка
	// «Эхографические признаки», и предпросмотр должен видеть оба источника.
	const watched = Form.useWatch([], { form, preserve: true }) as Record<string, unknown> | undefined
	const values = useMemo(() => watched ?? {}, [watched])

	const model = useMemo(
		() => buildReportModel({ data, values, doctor, patientBirthDate, extras, pxPerMm }),
		[data, values, doctor, patientBirthDate, extras, pxPerMm],
	)

	const showScaleWarning = useMemo(() => needsScaleCalibration(data, pxPerMm), [data, pxPerMm])

	// Перерисовываем документ не на каждый символ, иначе iframe мигает.
	const debouncedModel = useDebouncedValue(model, 400)
	const html = useMemo(() => renderReportHtml(debouncedModel), [debouncedModel])

	const [loadedHtml, setLoadedHtml] = useState<string | null>(null)
	const isFrameReady = loadedHtml === html

	const handlePrint = useCallback(() => {
		const frameWindow = frameRef.current?.contentWindow
		if (!frameWindow) return

		// Печатаем окно iframe, а не родительскую страницу: иначе в вывод
		// попадут модалка и весь интерфейс под ней.
		frameWindow.focus()
		frameWindow.print()
	}, [])

	const patch = useCallback(
		(next: Partial<ReportExtras>) => onExtrasChange({ ...extras, ...next }),
		[extras, onExtrasChange],
	)

	/** Значение поля формы исследования. */
	const fv = useCallback((name: string) => (values[name] ?? '') as string | number, [values])
	const setFv = useCallback((name: string, value: unknown) => form.setFieldValue(name, value), [form])

	const formColSpan = showPreview ? 11 : 24

	return (
		<Modal
			title='Заключение'
			open={open}
			onCancel={onClose}
			width='calc(100vw - 32px)'
			style={{ top: 16, maxWidth: 1720, paddingBottom: 0 }}
			styles={{ body: { height: 'calc(100vh - 150px)', overflow: 'hidden', paddingTop: 12 } }}
			footer={[
				<Space key='preview' style={{ marginRight: 'auto' }}>
					<Switch size='small' checked={showPreview} onChange={setShowPreview} />
					<Text type='secondary'>Предпросмотр</Text>
				</Space>,
				<Button key='close' onClick={onClose}>
					Закрыть
				</Button>,
				<Button key='print' type='primary' icon={<PrinterOutlined />} disabled={!isFrameReady} onClick={handlePrint}>
					Печать / Сохранить как PDF
				</Button>,
			]}
		>
			<Row gutter={16} style={{ height: '100%' }}>
				<Col span={formColSpan} style={{ height: '100%', overflowY: 'auto', paddingRight: 8 }}>
					{showScaleWarning && (
						<Alert type='warning' showIcon message={MISSING_SCALE_WARNING} style={{ marginBottom: 12 }} />
					)}
					<SectionTitle>Информация об исследовании</SectionTitle>
					<Field label='Предварительный диагноз'>
						<Input.TextArea
							rows={2}
							value={extras.preliminaryDiagnosis}
							onChange={e => patch({ preliminaryDiagnosis: e.target.value })}
						/>
					</Field>
					<Field label='Цель исследования'>
						<Input
							value={extras.studyReason}
							placeholder='Постановка диагноза'
							onChange={e => patch({ studyReason: e.target.value })}
						/>
					</Field>
					<Field label='Обоснование'>
						<Input.TextArea
							rows={2}
							value={extras.justification}
							onChange={e => patch({ justification: e.target.value })}
						/>
					</Field>

					<SectionTitle>Описание</SectionTitle>
					<Field label='Операции' hint='Описание операции при наличии таковой, в свободной форме'>
						<Input.TextArea rows={2} value={extras.operations} onChange={e => patch({ operations: e.target.value })} />
					</Field>
					<Field label='Щитовидная железа'>
						<Input.TextArea
							rows={2}
							value={extras.thyroidDescription}
							placeholder='Общее описание железы'
							onChange={e => patch({ thyroidDescription: e.target.value })}
						/>
					</Field>
					<Row gutter={12}>
						<Col span={12}>
							<Field label='Расположение'>
								<Input
									value={fv('position')}
									placeholder='типичное'
									onChange={e => setFv('position', e.target.value)}
								/>
							</Field>
						</Col>
						<Col span={12}>
							<Field label='Комментарий по расположению'>
								<Input value={extras.positionComment} onChange={e => patch({ positionComment: e.target.value })} />
							</Field>
						</Col>
					</Row>
					<Row gutter={12}>
						<Col span={12}>
							<Field label='Контуры'>
								<Input
									value={fv('profile')}
									placeholder='чёткие, ровные'
									onChange={e => setFv('profile', e.target.value)}
								/>
							</Field>
						</Col>
						<Col span={12}>
							<Field label='Подвижность долей при глотании'>
								<Input
									value={extras.mobility}
									placeholder='сохранена'
									onChange={e => patch({ mobility: e.target.value })}
								/>
							</Field>
						</Col>
					</Row>

					<SectionTitle>Размеры</SectionTitle>
					<Space align='center' style={{ marginBottom: 12 }}>
						<Switch size='small' checked={extras.sizeChanged} onChange={checked => patch({ sizeChanged: checked })} />
						<Text>Размеры изменены</Text>
					</Space>
					<Field label='Описание изменённых размеров'>
						<Input
							value={extras.sizeDescription}
							disabled={!extras.sizeChanged}
							onChange={e => patch({ sizeDescription: e.target.value })}
						/>
					</Field>
					<Row gutter={12}>
						<Col span={8}>
							<Field label='Перешеек, толщина (мм)'>
								<Input type='number' value={fv('isthmus_thickness')} onChange={e => setFv('isthmus_thickness', e.target.value)} />
							</Field>
						</Col>
						<Col span={8}>
							<Field label='Объём железы (см³)' hint='Пусто — считаем как сумму долей'>
								<Input type='number' value={fv('volume')} onChange={e => setFv('volume', e.target.value)} />
							</Field>
						</Col>
					</Row>

					<Text strong style={{ display: 'block', marginBottom: 8 }}>
						Правая доля, мм
					</Text>
					<Row gutter={12}>
						{(['right_lobe_length', 'right_lobe_width', 'right_lobe_thickness'] as const).map((name, index) => (
							<Col span={8} key={name}>
								<Field label={['Длина', 'Ширина', 'Толщина'][index]}>
									<Input type='number' value={fv(name)} onChange={e => setFv(name, e.target.value)} />
								</Field>
							</Col>
						))}
					</Row>

					<Text strong style={{ display: 'block', marginBottom: 8 }}>
						Левая доля, мм
					</Text>
					<Row gutter={12}>
						{(['left_lobe_length', 'left_lobe_width', 'left_lobe_thickness'] as const).map((name, index) => (
							<Col span={8} key={name}>
								<Field label={['Длина', 'Ширина', 'Толщина'][index]}>
									<Input type='number' value={fv(name)} onChange={e => setFv(name, e.target.value)} />
								</Field>
							</Col>
						))}
					</Row>

					<SectionTitle>Паренхима</SectionTitle>
					<Row gutter={12}>
						<Col span={12}>
							<Field label='Эхогенность'>
								<Input
									value={fv('echogenicity')}
									placeholder='не изменена'
									onChange={e => setFv('echogenicity', e.target.value)}
								/>
							</Field>
						</Col>
						<Col span={12}>
							<Field label='Сосудистый рисунок при ЦДК'>
								<Input value={fv('cdk')} placeholder='не усилен' onChange={e => setFv('cdk', e.target.value)} />
							</Field>
						</Col>
					</Row>
					<Field label='Описание сосудистого рисунка'>
						<Input value={extras.vascularDescription} onChange={e => patch({ vascularDescription: e.target.value })} />
					</Field>
					<Row gutter={12}>
						<Col span={12}>
							<Field label='Структура'>
								<Input
									value={fv('structure')}
									placeholder='однородная'
									onChange={e => setFv('structure', e.target.value)}
								/>
							</Field>
						</Col>
						<Col span={12}>
							<Field label='Описание неоднородной структуры'>
								<Input
									value={extras.structureDescription}
									onChange={e => patch({ structureDescription: e.target.value })}
								/>
							</Field>
						</Col>
					</Row>

					<SectionTitle>Очаговые изменения и окружение</SectionTitle>
					<Field label='Очаговые изменения' hint='Пусто — подставим описание узлов, собранное по разметке'>
						<Input.TextArea
							rows={3}
							value={extras.focalChanges}
							placeholder={model.nodulesDescription}
							onChange={e => patch({ focalChanges: e.target.value })}
						/>
					</Field>
					<Field label='Околощитовидные железы'>
						<Input.TextArea
							rows={2}
							value={extras.parathyroidDescription}
							onChange={e => patch({ parathyroidDescription: e.target.value })}
						/>
					</Field>
					<Space align='center' style={{ marginBottom: 12 }}>
						<Switch
							size='small'
							checked={extras.parathyroidMassesFound}
							onChange={checked => patch({ parathyroidMassesFound: checked })}
						/>
						<Text>Объёмные образования в проекции околощитовидных желёз выявлены</Text>
					</Space>
					<Field label='Регионарные лимфатические узлы'>
						<Input value={fv('rln')} placeholder='не изменены' onChange={e => setFv('rln', e.target.value)} />
					</Field>
					<Field label='Дополнительная информация'>
						<Input.TextArea
							rows={2}
							value={fv('additional_data')}
							onChange={e => setFv('additional_data', e.target.value)}
						/>
					</Field>

					<SectionTitle>Итог</SectionTitle>
					<Field label='Заключение'>
						<Input.TextArea rows={3} value={fv('diagnosis')} onChange={e => setFv('diagnosis', e.target.value)} />
					</Field>
					<Field label='Рекомендации'>
						<Input.TextArea
							rows={3}
							value={extras.recommendations}
							placeholder='Рекомендуется консультация лечащего врача'
							onChange={e => patch({ recommendations: e.target.value })}
						/>
					</Field>

					<Text type='secondary' style={{ display: 'block', fontSize: 12, paddingBottom: 8 }}>
						В диалоге печати выберите «Сохранить как PDF», чтобы получить файл.
					</Text>
				</Col>

				{showPreview && (
					<Col span={13} style={{ height: '100%' }}>
						<iframe
							ref={frameRef}
							title='Предпросмотр заключения'
							srcDoc={html}
							onLoad={() => setLoadedHtml(html)}
							style={{
								width: '100%',
								height: '100%',
								border: '1px solid #e5e7eb',
								borderRadius: 8,
								background: '#f0f0f0',
							}}
						/>
					</Col>
				)}
			</Row>
		</Modal>
	)
}

export default ReportModal
