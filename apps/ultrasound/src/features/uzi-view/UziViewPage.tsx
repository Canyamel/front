import React, { useCallback, useMemo, useState } from 'react'
import { Card, Form, Spin, theme } from 'antd'
import { StudyWorkspaceLayout, useStudyFocusMode } from '@medml/study_view'

import { useGetThyroidUziDataQuery, useGetUziDevicesQuery } from '@/api/uziApi'
import { useGetDoctorProfileQuery } from '@/api/doctorApi'
import { useGetMedPatientByIdQuery } from '@/api/patientProfileApi'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import { ReportModal, useReportExtras } from '@/features/uzi-report'
import { getSurfaceCardStyle } from '@/styles/uiPatterns'

import { Gallery } from './gallery'
import { ActionButtons, NoduleTypesSection, PatientInfoSection, StudyDataSection } from './sidebar'
import { useThyroidSegmentEditor, useThyroidStudyForm } from './model'
import type { Segment } from './model/types'

export interface UziViewPageProps {
	uziId: string
}

/**
 * Страница просмотра/редактирования снимка УЗИ ЩЖ.
 *
 * Раскладку (сводка сверху, снимок слева, панель справа) держит
 * `StudyWorkspaceLayout` из `@medml/study_view` — она общая с цитологией.
 * Здесь остаётся доменное: данные и мутации из `model/`, аннотирование —
 * в `viewer/`, печатное заключение — в `features/uzi-report`.
 */
const UziViewPage: React.FC<UziViewPageProps> = ({ uziId }) => {
	const { token } = theme.useToken()

	const { data, isLoading, error } = useGetThyroidUziDataQuery(uziId)
	const { data: devicesData } = useGetUziDevicesQuery()

	const devices = useMemo(() => (devicesData || []).map(d => ({ id: Number(d.id), name: d.name })), [devicesData])

	// Сегментация приходит с сервера; после мутаций RTK Query перечитывает
	// снимок сам (invalidatesTags), поэтому локального состояния тут нет.
	const editor = useThyroidSegmentEditor({
		uziId,
		serverSegmentation: data?.segmentation,
	})

	const studyForm = useThyroidStudyForm({ uziId, data, devices })

	const focus = useStudyFocusMode()

	// --- заключение -------------------------------------------------------
	const { doctorId } = useDoctorId()
	const { data: doctor } = useGetDoctorProfileQuery(doctorId, { skip: !doctorId })

	const patientId = data?.info.patient.id != null ? String(data.info.patient.id) : ''
	const { data: patientProfile } = useGetMedPatientByIdQuery(patientId, { skip: !patientId })

	const { extras, setExtras } = useReportExtras(uziId)
	const [reportOpen, setReportOpen] = useState(false)

	const handleOpenReport = useCallback(() => setReportOpen(true), [])
	const handleCloseReport = useCallback(() => setReportOpen(false), [])

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

		return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{errorMessage}</div>
	}

	const { patient } = data.info
	const cardStyle = getSurfaceCardStyle(token)

	// Ширину колонки и внешние отступы задаёт PageShell в UziViewRoute.
	return (
		<>
			<StudyWorkspaceLayout
				focus={focus}
				overviewTitle='Основная информация'
				overviewPrimary={<PatientInfoSection patient={patient} date={data.info.diagnos_date} />}
				overviewSecondary={<NoduleTypesSection aiTypes={aiTypes} doctorTypes={doctorTypes} />}
				viewerTitle='Редактор/просмотр изображения'
				viewer={
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
				}
				sidebar={
					<Form form={studyForm.form} layout='vertical'>
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
				}
			/>

			<ReportModal
				open={reportOpen}
				onClose={handleCloseReport}
				data={data}
				form={studyForm.form}
				doctor={doctor}
				patientBirthDate={patientProfile?.birthDate}
				extras={extras}
				onExtrasChange={setExtras}
			/>
		</>
	)
}

export default UziViewPage
