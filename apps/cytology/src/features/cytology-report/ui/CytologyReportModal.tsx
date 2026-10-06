import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Button, Col, Divider, Input, Modal, Row, Space, Switch, Typography } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'

import { useDebouncedValue } from '@medml/shared'
import type { DoctorProfileViewModel } from '@medml/doctor_profile'

import type { ICytologyInfo } from '@cytology/core/types/cytology'
import type { ISegmentStack } from '@cytology/core/types/segments'

import { buildCytologyReportModel } from '../model/buildReportModel'
import type { CytologyReportExtras } from '../model/types'
import { renderCytologyReportHtml } from './reportHtml'

const { Text, Title } = Typography

export interface CytologyReportModalProps {
	open: boolean
	onClose: () => void
	info: ICytologyInfo
	segments: ISegmentStack[]
	doctor?: DoctorProfileViewModel | null
	extras: CytologyReportExtras
	onExtrasChange: (next: CytologyReportExtras) => void
}

/** Подпись и контрол в одну колонку; без Form.Item, чтобы не плодить формы. */
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
 * Отчёт по цитологическому исследованию: слева поля врача, справа
 * предпросмотр печатной формы. Устроено так же, как заключение УЗИ.
 */
const CytologyReportModal: React.FC<CytologyReportModalProps> = ({
	open,
	onClose,
	info,
	segments,
	doctor,
	extras,
	onExtrasChange,
}) => {
	const frameRef = useRef<HTMLIFrameElement>(null)
	const [showPreview, setShowPreview] = useState(true)

	const model = useMemo(
		() => buildCytologyReportModel({ info, segments, doctor, extras }),
		[info, segments, doctor, extras],
	)

	// Перерисовываем документ не на каждый символ, иначе iframe мигает.
	const debouncedModel = useDebouncedValue(model, 400)
	const html = useMemo(() => renderCytologyReportHtml(debouncedModel), [debouncedModel])

	const [loadedHtml, setLoadedHtml] = useState<string | null>(null)
	const isFrameReady = loadedHtml === html

	const handlePrint = useCallback(() => {
		const frameWindow = frameRef.current?.contentWindow
		if (!frameWindow) return

		// Печатаем окно iframe, а не страницу: иначе в вывод попадёт интерфейс.
		frameWindow.focus()
		frameWindow.print()
	}, [])

	const patch = useCallback(
		(next: Partial<CytologyReportExtras>) => onExtrasChange({ ...extras, ...next }),
		[extras, onExtrasChange],
	)

	const formColSpan = showPreview ? 11 : 24

	return (
		<Modal
			title='Отчёт по исследованию'
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
					<SectionTitle>Информация об исследовании</SectionTitle>
					<Field label='Цель исследования'>
						<Input
							value={extras.studyReason}
							placeholder='Постановка диагноза'
							onChange={e => patch({ studyReason: e.target.value })}
						/>
					</Field>
					<Field label='Клинические данные'>
						<Input.TextArea
							rows={2}
							value={extras.clinicalData}
							onChange={e => patch({ clinicalData: e.target.value })}
						/>
					</Field>

					<SectionTitle>Содержание отчёта</SectionTitle>
					<Space direction='vertical' size={8} style={{ marginBottom: 12 }}>
						<Space>
							<Switch
								size='small'
								checked={extras.withCharacteristics}
								onChange={value => patch({ withCharacteristics: value })}
							/>
							<Text>Таблица характеристик</Text>
						</Space>
						<Space>
							<Switch
								size='small'
								checked={extras.withSegments}
								onChange={value => patch({ withSegments: value })}
							/>
							<Text>Перечень найденных объектов</Text>
						</Space>
					</Space>

					<SectionTitle>Заключение</SectionTitle>
					<Field
						label='Заключение врача'
						hint='Пусто — в документ попадёт диагноз из карты пациента, а если его нет, категория по разметке.'
					>
						<Input.TextArea
							rows={5}
							value={extras.conclusion}
							placeholder={info.diagnosis || 'Заключение по результатам исследования'}
							onChange={e => patch({ conclusion: e.target.value })}
						/>
					</Field>
					<Field label='Рекомендации'>
						<Input.TextArea
							rows={3}
							value={extras.recommendations}
							onChange={e => patch({ recommendations: e.target.value })}
						/>
					</Field>
					<Text type='secondary' style={{ fontSize: 11 }}>
						Поля отчёта хранятся в браузере и в карту пациента не записываются.
					</Text>
				</Col>

				{showPreview && (
					<Col span={13} style={{ height: '100%' }}>
						<iframe
							ref={frameRef}
							title='Предпросмотр отчёта'
							srcDoc={html}
							onLoad={() => setLoadedHtml(html)}
							style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}
						/>
					</Col>
				)}
			</Row>
		</Modal>
	)
}

export default CytologyReportModal
