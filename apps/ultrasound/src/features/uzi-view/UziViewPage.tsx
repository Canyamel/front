import React, { useMemo, useState } from 'react'
import { Button, Card, Col, Form, Grid, Row, Space, Spin, Typography, theme } from 'antd'

import { WidthControl } from '@/components/WidthControl/WidthControl'
import { useGetThyroidUziDataQuery, useGetUziDevicesQuery } from '@/api/uziApi'
import { getPageSurfaceStyle, getSurfaceCardStyle } from '@/styles/uiPatterns'

import { Gallery } from './gallery'
import {
	ActionButtons,
	NoduleTypesSection,
	PatientInfoSection,
	StudyDataSection,
} from './sidebar'
import { useThyroidSegmentEditor, useThyroidStudyForm } from './model'
import type { Segment } from './model/types'

export interface UziViewPageProps {
	uziId: string
}

/** Режим отображения: можно скрывать сводку и правую панель ради снимка. */
function useViewerFocusMode() {
	const [showOverview, setShowOverview] = useState(true)
	const [showSidebar, setShowSidebar] = useState(true)

	const isViewerFocused = !showOverview && !showSidebar
	const viewerHeight = isViewerFocused ? 820 : !showOverview || !showSidebar ? 720 : 600

	const toggleFocus = () => {
		const shouldFocus = showOverview || showSidebar
		setShowOverview(!shouldFocus)
		setShowSidebar(!shouldFocus)
	}

	return {
		showOverview,
		setShowOverview,
		showSidebar,
		setShowSidebar,
		isViewerFocused,
		viewerHeight,
		toggleFocus,
	}
}

/**
 * Страница просмотра/редактирования снимка УЗИ ЩЖ — композиция и разметка.
 * Данные и мутации живут в `model/`, аннотирование — в `viewer/`.
 */
const UziViewPage: React.FC<UziViewPageProps> = ({ uziId }) => {
	const { token } = theme.useToken()
	const screens = Grid.useBreakpoint()

	const { data, isLoading, error } = useGetThyroidUziDataQuery(uziId)
	const { data: devicesData } = useGetUziDevicesQuery()

	const devices = useMemo(
		() => (devicesData || []).map(d => ({ id: Number(d.id), name: d.name })),
		[devicesData],
	)

	// Сегментация приходит с сервера; после мутаций RTK Query перечитывает
	// снимок сам (invalidatesTags), поэтому локального состояния тут нет.
	const editor = useThyroidSegmentEditor({
		uziId,
		serverSegmentation: data?.segmentation,
	})

	const studyForm = useThyroidStudyForm({ uziId, data, devices })

	const focus = useViewerFocusMode()

	const { aiTypes, doctorTypes } = useMemo(() => {
		const segmentation = data?.segmentation || []
		return {
			aiTypes: segmentation.filter((s: Segment) => s.is_ai === true),
			doctorTypes: segmentation.filter((s: Segment) => s.is_ai === false),
		}
	}, [data])

	if (isLoading) {
		return (
			<div style={{ padding: '40px', textAlign: 'center' }}>
				<Spin size='large' tip='Загрузка данных...' />
			</div>
		)
	}

	if (error || !data) {
		const errorMessage = error
			? typeof error === 'object' && 'status' in error
				? `Ошибка ${error.status}`
				: 'Ошибка загрузки данных'
			: 'Не удалось загрузить данные'

		return (
			<div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
				{errorMessage}
			</div>
		)
	}

	const { patient } = data.info
	const { Title, Text } = Typography
	const cardStyle = getSurfaceCardStyle(token)

	return (
		<div style={getPageSurfaceStyle(token)}>
			<WidthControl>
				<Card
					style={{ ...cardStyle, marginBottom: 16 }}
					styles={{ body: { padding: 12 } }}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: 12,
							flexWrap: 'wrap',
						}}
					>
						<div>
							<Title level={5} style={{ margin: 0 }}>
								Режим просмотра
							</Title>
							<Text type='secondary'>
								Можно скрыть соседние блоки и увеличить область снимка
							</Text>
						</div>
						<Space wrap>
							<Button onClick={() => focus.setShowOverview(prev => !prev)}>
								{focus.showOverview ? 'Скрыть сводку' : 'Показать сводку'}
							</Button>
							<Button onClick={() => focus.setShowSidebar(prev => !prev)}>
								{focus.showSidebar ? 'Скрыть правую панель' : 'Показать правую панель'}
							</Button>
							<Button
								type={focus.isViewerFocused ? 'default' : 'primary'}
								onClick={focus.toggleFocus}
							>
								{focus.isViewerFocused ? 'Обычный режим' : 'Фокус на снимке'}
							</Button>
						</Space>
					</div>
				</Card>

				{focus.showOverview && (
					<Card
						style={{ ...cardStyle, marginBottom: 16 }}
						styles={{ body: { padding: 16 } }}
					>
						<Title level={4} style={{ marginBottom: 4 }}>
							Основная информация
						</Title>
						<Text type='secondary'>Сводка по пациенту и диагностике</Text>

						<Row gutter={[12, 12]} style={{ marginTop: 8 }} align='stretch'>
							<Col xs={24} xl={12}>
								<PatientInfoSection patient={patient} date={data.info.diagnos_date} />
							</Col>
							<Col xs={24} xl={12}>
								<NoduleTypesSection aiTypes={aiTypes} doctorTypes={doctorTypes} />
							</Col>
						</Row>
					</Card>
				)}

				<Row gutter={[16, 16]} align='top'>
					<Col xs={24} lg={focus.showSidebar ? 16 : 24}>
						<Card
							title='Редактор/просмотр изображения'
							style={cardStyle}
							styles={{ body: { padding: 12 } }}
						>
							<Gallery
								link1={data.image.image}
								image_count={data.info.image_count ?? 1}
								slide_template={data.image.slide_template}
								slide_urls={data.image.slide_urls}
								seg={editor.displaySegmentation}
								imageid={data.image.id}
								isEditMode={editor.isEditMode}
								onStartEdit={editor.startEdit}
								onSaveEdit={editor.saveSegments}
								onCancelEdit={editor.cancelEdit}
								isSaving={editor.isSaving}
								hasUnsavedChanges={editor.hasUnsavedChanges}
								onDraftChangesChange={editor.setPendingChanges}
								viewerResetKey={editor.viewerResetKey}
								viewerHeight={focus.viewerHeight}
							/>
						</Card>
					</Col>

					{focus.showSidebar && (
						<Col xs={24} lg={8}>
							<div
								style={{
									position: screens.lg ? 'sticky' : 'static',
									top: screens.lg ? 12 : 0,
									display: 'flex',
									flexDirection: 'column',
									gap: 12,
									maxHeight: screens.lg ? 'calc(100vh - 96px)' : 'none',
									overflow: screens.lg ? 'auto' : 'visible',
									paddingRight: 2,
								}}
							>
								<Form form={studyForm.form} layout='vertical'>
									<StudyDataSection
										form={studyForm.form}
										devices={devices}
										modalVisible={studyForm.modalVisible}
										setModalVisible={studyForm.setModalVisible}
										onSave={studyForm.handleSave}
										saving={studyForm.saving}
									/>

									<Card
										size='small'
										style={cardStyle}
										styles={{ body: { padding: 12 } }}
									>
										<ActionButtons onSave={studyForm.handleSave} />
									</Card>
								</Form>
							</div>
						</Col>
					)}
				</Row>
			</WidthControl>
		</div>
	)
}

export default UziViewPage
