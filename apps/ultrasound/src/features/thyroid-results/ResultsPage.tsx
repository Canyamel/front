import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
	Button,
	Card,
	Col,
	Form,
	Grid,
	Row,
	Space,
	Spin,
	Typography,
	message,
	theme,
} from 'antd'
import axios from 'axios'
import PatientInfoSection from './PatientInfoSection'
import NoduleTypesSection from './NoduleTypesSection'
import Gallery from './Gallery'
import StudyDataSection from './StudyDataSection'
import ActionButtons from './ActionButtons'
import { WidthControl } from '@/components/WidthControl/WidthControl'
import { useSelector } from 'react-redux'
import type { RootState } from '@medml/store'
import type { Segment, SegmentDraftChange } from '@/features/thyroid-results/thyroidResultsTypes'
import {
	useGetThyroidUziDataQuery,
	useUpdateThyroidUziDataMutation,
	useGetUziDevicesQuery,
} from '@/api/uziApi'
import { getThyroidApiOrigin } from '@/features/thyroid-results/thyroidApiOrigin'
import { clearThyroidUziBundle } from '@/features/uzi-view/service/thyroidUziBridge'
import { getPageSurfaceStyle, getSurfaceCardStyle } from '@/styles/uiPatterns'

const cloneSegmentation = (segments: Segment[] = []): Segment[] =>
	segments.map(segment => ({
		...segment,
		data: (segment.data || []).map(contour => ({
			...contour,
			points: contour.points.map(point => ({ ...point })),
		})),
	}))

const applyDraftChangesToSegmentation = (
	segments: Segment[],
	changes: SegmentDraftChange[],
	createdContourIds: Record<string, number> = {},
): Segment[] => {
	const next = cloneSegmentation(segments)

	const findSegmentByGroup = (segmentGroup?: string | number) =>
		next.find(segment => String(segment.id) === String(segmentGroup))

	const findContour = (
		annotationId: string,
		segmentGroup?: string | number,
	) => {
		for (const segment of next) {
			const contourIndex = (segment.data || []).findIndex(
				contour => String(contour.id) === String(annotationId),
			)
			if (contourIndex >= 0) {
				return { segment, contourIndex }
			}
		}

		const fallbackSegment = findSegmentByGroup(segmentGroup)
		if (fallbackSegment && (fallbackSegment.data || []).length === 1) {
			return { segment: fallbackSegment, contourIndex: 0 }
		}

		return null
	}

	for (const change of changes) {
		if (change.type === 'create') {
			const targetSegment = findSegmentByGroup(change.segment_group)
			const changePoints = change.points || []
			if (!targetSegment || !changePoints.length) {
				continue
			}

			targetSegment.data = [
				...(targetSegment.data || []),
				{
					id: createdContourIds[change.annotationId],
					points: changePoints.map(point => ({ ...point })),
				},
			]
			continue
		}

		const target = findContour(change.annotationId, change.segment_group)
		if (!target) {
			continue
		}

		if (change.type === 'update' && change.points?.length) {
			const changePoints = change.points || []
			target.segment.data = (target.segment.data || []).map((contour, index) =>
				index === target.contourIndex
					? {
							...contour,
							points: changePoints.map(point => ({ ...point })),
						}
					: contour,
			)
			continue
		}

		target.segment.data = (target.segment.data || []).filter(
			(_, index) => index !== target.contourIndex,
		)
	}

	return next
}

export interface ThyroidResultsPageProps {
	uziId: string
}

const ThyroidResultsPage: React.FC<ThyroidResultsPageProps> = ({ uziId }) => {
	const url = getThyroidApiOrigin()
	const accessToken = useSelector((s: RootState) => s.auth.accessToken)
	const [form] = Form.useForm()
	const [saving, setSaving] = useState(false)
	const [modalVisible, setModalVisible] = useState(false)
	const [isSegmentEditMode, setIsSegmentEditMode] = useState(false)
	const [isSavingSegments, setIsSavingSegments] = useState(false)
	const [pendingSegmentChanges, setPendingSegmentChanges] = useState<
		SegmentDraftChange[]
	>([])
	const [displaySegmentation, setDisplaySegmentation] = useState<Segment[]>([])
	const [hasLocalSegmentationOverride, setHasLocalSegmentationOverride] =
		useState(false)
	const [viewerResetKey, setViewerResetKey] = useState(0)
	const [showOverview, setShowOverview] = useState(true)
	const [showSidebar, setShowSidebar] = useState(true)

	const { data, isLoading, error, refetch } = useGetThyroidUziDataQuery(uziId)
	const { data: devicesData } = useGetUziDevicesQuery()
	const [updateUzi] = useUpdateThyroidUziDataMutation()
	const { token } = theme.useToken()
	const screens = Grid.useBreakpoint()

	const { aiTypes, doctorTypes } = useMemo(() => {
		const segmentation = data?.segmentation || []
		const ai = segmentation.filter((s: Segment) => s.is_ai === true)
		const doc = segmentation.filter((s: Segment) => s.is_ai === false)
		return { aiTypes: ai, doctorTypes: doc }
	}, [data])

	useEffect(() => {
		if (
			data?.segmentation &&
			!hasLocalSegmentationOverride &&
			!isSegmentEditMode
		) {
			setDisplaySegmentation(cloneSegmentation(data.segmentation))
		}
	}, [data, hasLocalSegmentationOverride, isSegmentEditMode])

	useEffect(() => {
		if (data && devicesData) {
			form.setFieldsValue({
				uziDevice:
					devicesData?.find(d => d.name === data.info.uzi_device_name)?.id ||
					null,
				projectionType: data.info.details.projection_type || 'long',
				shortResult: data.info.has_nodules === 'T',
				cdk: data.info.details.cdk,
				diagnosis: data.info.diagnosis,
				echogenicity: data.info.details.echogenicity,
				isthmus: data.info.details.isthmus,
				left_depth: data.info.details.left_depth,
				left_length: data.info.details.left_length,
				left_width: data.info.details.left_width,
				position: data.info.details.position,
				profile: data.info.details.profile,
				result: data.info.details.result,
				right_depth: data.info.details.right_depth,
				right_length: data.info.details.right_length,
				right_width: data.info.details.right_width,
				rln: data.info.details.rln,
				structure: data.info.details.structure,
				additional_data: data.info.details.additional_data,
			})
		}
	}, [data, devicesData, form])

	const getRequestConfig = useCallback(() => {
		return accessToken
			? {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}
			: undefined
	}, [accessToken])

	const handleStartSegmentEdit = () => {
		setIsSegmentEditMode(true)
		setPendingSegmentChanges([])
	}

	const handleCancelSegmentEdit = () => {
		setIsSegmentEditMode(false)
		setPendingSegmentChanges([])
		setViewerResetKey(prev => prev + 1)
		message.info('Изменения сегментов отменены')
	}

	const handleSaveSegments = async () => {
		if (!pendingSegmentChanges.length) {
			setIsSegmentEditMode(false)
			message.success('Редактирование сегментов завершено')
			return
		}

		setIsSavingSegments(true)
		try {
			const requestConfig = getRequestConfig()
			const createdContourIds: Record<string, number> = {}
			const resolveSavedContourId = (change: SegmentDraftChange) => {
				if (/^\d+$/.test(String(change.annotationId))) {
					return String(change.annotationId)
				}

				const segment = displaySegmentation.find(
					item => String(item.id) === String(change.segment_group),
				)
				const contourId = segment?.data?.find(contour => contour.id != null)?.id
				return contourId != null
					? String(contourId)
					: String(change.annotationId)
			}

			for (const change of pendingSegmentChanges) {
				if (change.type === 'create') {
					if (!change.segment_group) {
						throw new Error('Не выбран узел для нового контура')
					}

					const response = await axios.post(
						`${url}/uzi/segment/add/`,
						{
							points: change.points || [],
							segment_group: change.segment_group,
						},
						requestConfig,
					)
					createdContourIds[change.annotationId] = response.data.id
					continue
				}

				const savedContourId = resolveSavedContourId(change)

				if (change.type === 'update') {
					await axios.put(
						`${url}/uzi/segment/update/${savedContourId}/`,
						{
							points: change.points || [],
							...(change.segment_group
								? { segment_group: change.segment_group }
								: {}),
						},
						requestConfig,
					)
					continue
				}

				await axios.delete(
					`${url}/uzi/segment/update/${savedContourId}/`,
					requestConfig,
				)
			}

			setDisplaySegmentation(prev =>
				applyDraftChangesToSegmentation(
					prev.length ? prev : data?.segmentation || [],
					pendingSegmentChanges,
					createdContourIds,
				),
			)
			setHasLocalSegmentationOverride(true)
			clearThyroidUziBundle(uziId)
			void refetch()
			setIsSegmentEditMode(false)
			setPendingSegmentChanges([])
			setViewerResetKey(prev => prev + 1)
			message.success('Изменения сегментов сохранены')
		} catch (segmentError: any) {
			console.error('Error saving segments:', segmentError)
			message.error(
				segmentError?.response?.data?.detail ||
					'Ошибка при сохранении сегментов',
			)
		} finally {
			setIsSavingSegments(false)
		}
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			const values = await form.validateFields()

			const payload = {
				patient_card: {
					patient: data?.info.patient.id,
					has_nodules: values.shortResult ? 'T' : 'F',
					diagnosis: values.diagnosis,
				},
				acceptance_datetime: data?.info.diagnos_date,
				details: {
					...values,
					nodule_type: [],
					ai_info: [],
				},
				uzi_device: values.uziDevice,
			}

			await updateUzi({ uziId, data: payload }).unwrap()
			clearThyroidUziBundle(uziId)
			message.success('Результат сохранен!')
			setModalVisible(false)
			await refetch()
		} catch (saveError) {
			console.error('Error saving:', saveError)
			message.error('Ошибка при сохранении')
		} finally {
			setSaving(false)
		}
	}

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
	const isViewerFocused = !showOverview && !showSidebar
	const viewerHeight = isViewerFocused
		? 820
		: !showOverview || !showSidebar
			? 720
			: 600

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
							<Button onClick={() => setShowOverview(prev => !prev)}>
								{showOverview ? 'Скрыть сводку' : 'Показать сводку'}
							</Button>
							<Button onClick={() => setShowSidebar(prev => !prev)}>
								{showSidebar
									? 'Скрыть правую панель'
									: 'Показать правую панель'}
							</Button>
							<Button
								type={isViewerFocused ? 'default' : 'primary'}
								onClick={() => {
									const shouldFocus = showOverview || showSidebar
									setShowOverview(!shouldFocus)
									setShowSidebar(!shouldFocus)
								}}
							>
								{isViewerFocused ? 'Обычный режим' : 'Фокус на снимке'}
							</Button>
						</Space>
					</div>
				</Card>

				{showOverview && (
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
								<PatientInfoSection
									patient={patient}
									date={data.info.diagnos_date}
								/>
							</Col>
							<Col xs={24} xl={12}>
								<NoduleTypesSection
									aiTypes={aiTypes}
									doctorTypes={doctorTypes}
								/>
							</Col>
						</Row>
					</Card>
				)}

				<Row gutter={[16, 16]} align='top'>
					<Col xs={24} lg={showSidebar ? 16 : 24}>
						<Card
							title='Редактор/просмотр изображения'
							style={cardStyle}
							styles={{ body: { padding: 12 } }}
						>
							<Gallery
								url={url}
								link1={data.image.image}
								date={new Date(data.info.diagnos_date).toISOString()}
								image_count={data.info.image_count ?? 1}
								slide_template={data.image.slide_template}
								slide_urls={data.image.slide_urls}
								seg={displaySegmentation}
								imageid={data.image.id}
								isEditMode={isSegmentEditMode}
								onStartEdit={handleStartSegmentEdit}
								onSaveEdit={handleSaveSegments}
								onCancelEdit={handleCancelSegmentEdit}
								isSaving={isSavingSegments}
								hasUnsavedChanges={pendingSegmentChanges.length > 0}
								onDraftChangesChange={setPendingSegmentChanges}
								viewerResetKey={viewerResetKey}
								viewerHeight={viewerHeight}
							/>
						</Card>
					</Col>

					{showSidebar && (
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
								<Form form={form} layout='vertical'>
									<StudyDataSection
										form={form}
										devices={(devicesData || []).map(d => ({
											id: Number(d.id),
											name: d.name,
										}))}
										modalVisible={modalVisible}
										setModalVisible={setModalVisible}
										onSave={handleSave}
										saving={saving}
									/>

									<Card
										size='small'
										style={cardStyle}
										styles={{ body: { padding: 12 } }}
									>
										<ActionButtons onSave={handleSave} />
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

export default ThyroidResultsPage
