import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Typography, theme } from 'antd'
import { skipToken } from '@reduxjs/toolkit/query'

import { useAppSelector } from '@medml/store'
import { StudyPatientCard } from '@medml/patient_view'
import { getSurfaceCardStyle } from '@medml/ui'
import { StudyWorkspaceLayout, useStudyFocusMode } from '@medml/study_view'

import { useGetCytologyInfoQuery, useGetCytologySegmentsQuery, useGetCytologyTypesQuery } from './core/service/cytology'
import type { ISegmentStack, SegmentType } from './core/types/segments'
import { CytologyViewProvider, useCytologyContourEditor, type CytologyViewContextValue } from './model'
import CytologyDiagnosisPanel from './sidebar/CytologyDiagnosisPanel'
import { CytologyStudyViewer, CytologyViewerToolbar } from './viewer'

import './CytologyViewPage.css'

const { Text } = Typography

const NO_SEGMENTS: ISegmentStack[] = []

/**
 * Страница исследования цитологии.
 */
export default function CytologyViewPage() {
	const params = useParams<{ id: string }>()
	const cytologyId = params.id?.trim() ?? ''
	const accessToken = useAppSelector(state => state.auth.accessToken)
	const queryId = accessToken && cytologyId ? cytologyId : skipToken

	const { token } = theme.useToken()
	const cardStyle = getSurfaceCardStyle(token)
	const focus = useStudyFocusMode()

	const { data: cytologyData } = useGetCytologyInfoQuery(queryId)
	const { data: segmentTypes } = useGetCytologyTypesQuery(queryId)

	const typeCodes = useMemo(() => (segmentTypes ?? []).map(type => type.code), [segmentTypes])
	const { data: segments = NO_SEGMENTS } = useGetCytologySegmentsQuery(
		queryId !== skipToken && typeCodes.length > 0 ? { id: queryId, types: typeCodes } : skipToken,
	)

	const [currentType, setCurrentType] = useState<SegmentType | null>(null)
	const info = cytologyData?.info
	const editor = useCytologyContourEditor({ cytologyId, info, segments })

	const segmentTypeColors = useMemo(
		() => Object.fromEntries((segmentTypes ?? []).map(type => [type.code, type.color])),
		[segmentTypes],
	)

	const patient = info?.patient
	const patientFullName = [patient?.last_name, patient?.first_name, patient?.fathers_name]
		.filter(part => part && part.trim())
		.join(' ')

	const marking = info?.diagnostic_marking?.trim()
	const number = info?.diagnostic_number
	const markingLabel = marking || number ? [marking, number].filter(part => part != null && part !== '').join('-') : '—'

	const context = useMemo<CytologyViewContextValue>(
		() => ({
			cytologyId,
			info,
			segmentTypes: segmentTypes ?? [],
			segments,
			currentType,
			setCurrentType,
			editor,
		}),
		[cytologyId, info, segmentTypes, segments, currentType, editor],
	)

	if (!cytologyId) return null

	return (
		<CytologyViewProvider value={context}>
			<StudyWorkspaceLayout
				focus={focus}
				sidebarLabel='панель заключения'
				overviewPrimary={
					<StudyPatientCard
						fullName={patientFullName}
						policyNumber={patient?.personal_policy}
						studyDate={info?.diagnos_date}
					/>
				}
				overviewSecondary={
					<Card
						title='Диагностика'
						size='small'
						style={{ ...cardStyle, height: '100%' }}
						styles={{ body: { padding: '8px 12px' } }}
					>
						<Text type='secondary'>Маркировка</Text>
						<div>
							<Text strong>{markingLabel}</Text>
						</div>
					</Card>
				}
				viewerTitle='Редактор/просмотр снимка'
				viewer={
					<>
						<CytologyViewerToolbar />
						<CytologyStudyViewer
							imageUrl={cytologyData?.original_image.image}
							segments={segments}
							segmentTypeColors={segmentTypeColors}
							currentType={currentType}
							drafts={editor.drafts}
							annotationApiRef={editor.annotationApiRef}
							readOnly={!editor.isEditing}
							height={focus.viewerHeight}
						/>
					</>
				}
				sidebar={<CytologyDiagnosisPanel />}
			/>
		</CytologyViewProvider>
	)
}
