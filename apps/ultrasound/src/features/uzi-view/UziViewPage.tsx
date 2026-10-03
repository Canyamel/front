import React, { useCallback, useMemo, useState } from 'react'
import { Card, Form, Spin, theme } from 'antd'
import { StudyWorkspaceLayout, useStudyFocusMode } from '@medml/study_view'

import { useGetThyroidUziDataQuery, useGetUziDevicesQuery } from '@/api/uziApi'
import { useGetDoctorProfileQuery } from '@/api/doctorApi'
import { useGetMedPatientByIdQuery } from '@/api/patientProfileApi'
import { useDoctorId } from '@/api/hooks/useDoctorId'
import { ReportModal, useReportExtras } from '@/features/uzi-report'
import { getSurfaceCardStyle } from '@/styles/uiPatterns'
import { toSameOriginMediaUrl, toSameOriginMediaUrls } from '@/lib/mediaUrl'

import { Gallery } from './gallery'
import { ActionButtons, NoduleTypesSection, PatientInfoSection, StudyDataSection } from './sidebar'
import { anatomyToStructureJson, splitSegmentation, useUziContourEditor, useUziStudyForm } from './model'
import type { Segment } from './model/types'

/**
 * Показ контуров долей/перешейка ЩЖ. Временно выключен. Чтобы вернуть — поставить `true`.
 */
const SHOW_THYROID_STRUCTURES = false

export interface UziViewPageProps {
	uziId: string
}

const UziViewPage: React.FC<UziViewPageProps> = ({ uziId }) => {
	const { token } = theme.useToken()

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

	const reportData = useMemo(() => (data ? { ...data, segmentation: nodules } : data), [data, nodules])

	const contourEditor = useUziContourEditor({ uziId })
	const studyForm = useUziStudyForm({ uziId, data, devices })

	const focus = useStudyFocusMode()

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
	const cardStyle = getSurfaceCardStyle(token)

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
						link1={toSameOriginMediaUrl(data.image.image)}
						image_count={data.info.image_count ?? 1}
						slide_template={toSameOriginMediaUrls(data.image.slide_template)}
						slide_urls={toSameOriginMediaUrls(data.image.slide_urls)}
						segments={nodules}
						imageid={data.image.id}
						contourEditor={contourEditor}
						viewerHeight={focus.viewerHeight}
						onPxPerMmChange={setPxPerMm}
						thyroidStructures={thyroidStructures}
					/>
				}
				sidebar={
					<Form form={studyForm.form} layout='vertical' style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
