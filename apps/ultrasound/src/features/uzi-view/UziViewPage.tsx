import React, { useCallback, useMemo, useState } from 'react'
import { Card, Col, Form, Grid, Row, Spin, Typography, theme } from 'antd'
import { useViewerFocusMode, ViewerFocusBar } from '@medml/viewers'

import { useGetThyroidUziDataQuery, useGetUziDevicesQuery } from '@/api/uziApi'
import { useGetDoctorProfileQuery } from '@/api/doctorApi'
import { useGetMedPatientByIdQuery } from '@/api/patientProfileApi'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import { ReportModal, useReportExtras } from '@/features/uzi-report'
import { getSurfaceCardStyle } from '@/styles/uiPatterns'
import { toSameOriginMediaUrl, toSameOriginMediaUrls } from '@/lib/mediaUrl'

import { Gallery } from './gallery'
import { ActionButtons, NoduleTypesSection, PatientInfoSection, StudyDataSection } from './sidebar'
import { anatomyToStructureJson, splitSegmentation, useThyroidSegmentEditor, useThyroidStudyForm } from './model'
import type { Segment } from './model/types'

/**
 * Показ контуров долей/перешейка ЩЖ. Временно выключен. Чтобы вернуть — поставить `true`.
 */
const SHOW_THYROID_STRUCTURES = false

export interface UziViewPageProps {
	uziId: string
}

/**
 * Страница просмотра/редактирования снимка УЗИ ЩЖ — композиция и разметка.
 * Данные и мутации живут в `model/`, аннотирование — в `viewer/`,
 * печатное заключение — в `features/uzi-report`.
 */
/** Запас под тень карточек в прокручиваемом сайдбаре (см. shadow.card). */
const SIDEBAR_SHADOW_ROOM = 12
const SIDEBAR_SHADOW_ROOM_BOTTOM = 40

const UziViewPage: React.FC<UziViewPageProps> = ({ uziId }) => {
	const { token } = theme.useToken()
	const screens = Grid.useBreakpoint()

	const { data, isLoading, error } = useGetThyroidUziDataQuery(uziId)
	const { data: devicesData } = useGetUziDevicesQuery()

	const devices = useMemo(() => (devicesData || []).map(d => ({ id: Number(d.id), name: d.name })), [devicesData])

	// В `segmentation` бэкенд кладёт и узлы, и контуры долей/перешейка ЩЖ
	// (`source_type: 'thyroid_anatomy'`). Узлами считаем только первые,
	// анатомию рисуем отдельным слоем вьюера.
	const { nodules, anatomy } = useMemo(() => splitSegmentation(data?.segmentation), [data?.segmentation])
	const thyroidStructures = useMemo(
		() => (SHOW_THYROID_STRUCTURES ? anatomyToStructureJson(anatomy) : undefined),
		[anatomy],
	)

	// Заключение строится по `data.segmentation` — отдаём туда только узлы.
	const reportData = useMemo(() => (data ? { ...data, segmentation: nodules } : data), [data, nodules])

	// Сегментация приходит с сервера; после мутаций RTK Query перечитывает
	// снимок сам (invalidatesTags), поэтому локального состояния тут нет.
	const editor = useThyroidSegmentEditor({
		uziId,
		serverSegmentation: nodules,
	})

	const studyForm = useThyroidStudyForm({ uziId, data, devices })

	const focus = useViewerFocusMode()

	// Масштаб задаётся во вьюере, а нужен ещё и
	// заключению: по нему считаются размеры узлов в миллиметрах.
	const [pxPerMm, setPxPerMm] = useState<number | null>(null)

	// --- заключение -------------------------------------------------------
	const { doctorId } = useDoctorId()
	const { data: doctor } = useGetDoctorProfileQuery(doctorId, { skip: !doctorId })

	const patientId = data?.info.patient.id != null ? String(data.info.patient.id) : ''
	const { data: patientProfile } = useGetMedPatientByIdQuery(patientId, { skip: !patientId })

	const { extras, setExtras } = useReportExtras(uziId)
	const [reportOpen, setReportOpen] = useState(false)

	const handleOpenReport = useCallback(() => setReportOpen(true), [])
	const handleCloseReport = useCallback(() => setReportOpen(false), [])

	const { aiTypes, doctorTypes } = useMemo(
		() => ({
			aiTypes: nodules.filter((s: Segment) => s.is_ai === true),
			doctorTypes: nodules.filter((s: Segment) => s.is_ai === false),
		}),
		[nodules],
	)

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

		return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{errorMessage}</div>
	}

	const { patient } = data.info
	const { Title, Text } = Typography
	const cardStyle = getSurfaceCardStyle(token)

	return (
		<>
			<ViewerFocusBar focus={focus} style={cardStyle} />

			{focus.showOverview && (
				<Card style={cardStyle} styles={{ body: { padding: 16 } }}>
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
					<Card title='Редактор/просмотр изображения' style={cardStyle} styles={{ body: { padding: 12 } }}>
						<Gallery
							link1={toSameOriginMediaUrl(data.image.image)}
							image_count={data.info.image_count ?? 1}
							slide_template={toSameOriginMediaUrls(data.image.slide_template)}
							slide_urls={toSameOriginMediaUrls(data.image.slide_urls)}
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
							onPxPerMmChange={setPxPerMm}
							thyroidStructures={thyroidStructures}
						/>
					</Card>
				</Col>

				{focus.showSidebar && (
					<Col xs={24} lg={8}>
						<div
							style={{
								position: screens.lg ? 'sticky' : 'static',
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
								...(screens.lg
									? {
											// Прокручиваемый блок обрезает тень карточек (shadow.card
											// 0 12px 36px) по своим краям — на фоне был виден
											// прямоугольник. Даём тени место внутри блока и
											// компенсируем отрицательным margin, чтобы карточки
											// остались на прежних местах.
											top: 0,
											padding: `${SIDEBAR_SHADOW_ROOM}px ${SIDEBAR_SHADOW_ROOM + 2}px ${SIDEBAR_SHADOW_ROOM_BOTTOM}px ${SIDEBAR_SHADOW_ROOM}px`,
											margin: `-${SIDEBAR_SHADOW_ROOM}px -${SIDEBAR_SHADOW_ROOM + 2}px -${SIDEBAR_SHADOW_ROOM_BOTTOM}px -${SIDEBAR_SHADOW_ROOM}px`,
											maxHeight: `calc(100vh - 84px + ${SIDEBAR_SHADOW_ROOM + SIDEBAR_SHADOW_ROOM_BOTTOM}px)`,
											overflow: 'auto',
										}
									: { overflow: 'visible' }),
							}}
						>
							<Form
								form={studyForm.form}
								layout='vertical'
								style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
							>
								<StudyDataSection
									form={studyForm.form}
									devices={devices}
									modalVisible={studyForm.modalVisible}
									setModalVisible={studyForm.setModalVisible}
									onSave={studyForm.handleSave}
									saving={studyForm.saving}
								/>

								<Card size='small' style={cardStyle} styles={{ body: { padding: 12 } }}>
									<ActionButtons onSave={studyForm.handleSave} onOpenReport={handleOpenReport} />
								</Card>
							</Form>
						</div>
					</Col>
				)}
			</Row>

			<ReportModal
				open={reportOpen}
				onClose={handleCloseReport}
				data={reportData ?? data}
				form={studyForm.form}
				doctor={doctor}
				patientBirthDate={patientProfile?.birthDate}
				extras={extras}
				onExtrasChange={setExtras}
				pxPerMm={pxPerMm}
			/>
		</>
	)
}

export default UziViewPage
