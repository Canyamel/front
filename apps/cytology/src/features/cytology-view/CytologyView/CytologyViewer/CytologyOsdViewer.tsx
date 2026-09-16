import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Flex, InputNumber, Modal, Typography, message } from 'antd'
import { FileImageOutlined } from '@ant-design/icons'
import {
	UziViewer,
	RulerOverlay,
	BrushCanvasOverlay,
	SegmentsVisibilityToggle,
	useRulerMeasurements,
	createMask,
	isMaskEmpty,
	maskToPolygon,
	maskScaleFor,
	calcPxPerMm,
	lineLengthPx,
	BRUSH_TOOL,
	CALIBRATE_TOOL,
	isRulerLikeTool,
	type ViewerImage,
	type BrushMask,
	type BrushMode,
	type MeasuredLine,
} from '@medml/viewers'

import { useDziTileSource } from '@/lib/useDziTileSource'
import { CYTOLOGY_EDITING_ENABLED } from '@/lib/cytologyFeatures'

import { useAppSelector } from '@cytology/core/hooks'
import { Tools } from '@cytology/core/types/basic'
import { ISegmentStack } from '@cytology/core/types/segments'

import { useCytologyAnnotator } from './useCytologyAnnotator'
import SegmentPopup from './SegmentPopup'
import EditPanel from './EditPanel/EditPanel'
import { createSelectStyleFromConfig } from './Viewer/utils/selectStyleFromConfig'
import { IPoint } from './Viewer/interfaces/queries'

import './Viewer/viewer.scss'

/**
 * Просмотр снимка цитологии на общем движке `@medml/viewers`.
 *
 * Владеет всем состоянием инструментов (аналог `ThyroidAnnotatedViewer` в
 * УЗИ): выбранный инструмент, разметка через Annotorious, линейка и
 * калибровка масштаба, кисть-заливка. Линейка и кисть работают мимо
 * Annotorious — на собственных слоях из `@medml/viewers`, поэтому не зависят
 * от того, что цитология использует Annotorious v3, а УЗИ — v2.
 */

interface CytologyOsdViewerProps {
	imageUrl: string | undefined
	isEditMode: boolean
	selected: boolean
	needPopup?: boolean
	className?: string
	height?: number | string
	segments?: ISegmentStack[]
	segmentTypeColors?: Record<string, string>
	addSegment: (contour: IPoint[]) => void
	changeSegment: (segmentId: string, contour: IPoint[]) => void
}

const TOOLBAR_CONFIG = { showZoom: true, showFit: true, showRotate: true }
/** Единственный кадр — постраничности, как у УЗИ, здесь нет. */
const PAGE = 0

function statusMessage(text: string) {
	return (
		<Flex vertical align='center' justify='center' className='cytology-viewer-empty'>
			<FileImageOutlined className='cytology-viewer-empty-icon' />
			<Typography.Paragraph className='cytology-viewer-empty-text'>{text}</Typography.Paragraph>
		</Flex>
	)
}

const CytologyOsdViewer: React.FC<CytologyOsdViewerProps> = ({
	imageUrl,
	isEditMode,
	selected,
	needPopup = false,
	className,
	height = 600,
	segments = [],
	segmentTypeColors = {},
	addSegment,
	changeSegment,
}) => {
	const { tileSource, isLoading, error } = useDziTileSource(imageUrl ?? '')
	const currentSegment = useAppSelector(state => state.segment.currentSegment)

	// Создание/правка сегментов (rectangle/polygon/brush) заперты тем же
	// флагом, что и весь редактор диагностики (`CytologyDiagnosisPanel`,
	// `CytologyDiagnosis`): сценарий сохранения ломает данные (см.
	// `cytologyFeatures.ts`). Линейка, калибровка масштаба и переключатель
	// видимости сегментов ничего не сохраняют — они доступны независимо от
	// этого флага, прямо в просмотре.
	const segmentToolsEnabled = CYTOLOGY_EDITING_ENABLED && isEditMode

	const [tool, setTool] = useState<Tools>('move')
	const [showSegments, setShowSegments] = useState(true)

	// Масштаб выводится из эталонного отрезка: врач проводит линию по шкале
	// снимка и указывает её длину в миллиметрах — взять коэффициент неоткуда,
	// на глаз пиксели на миллиметр не считаются.
	const [pxPerMm, setPxPerMm] = useState<number | null>(null)
	const [calibrationPx, setCalibrationPx] = useState<number | null>(null)
	const [calibrationMm, setCalibrationMm] = useState<number | null>(null)

	const [brushMode, setBrushMode] = useState<BrushMode>('draw')
	const [brushRadius, setBrushRadius] = useState(12)
	const [mask, setMask] = useState<BrushMask | null>(null)
	const [sketchVersion, setSketchVersion] = useState(0)

	const ruler = useRulerMeasurements()

	// Снимки цитологии — гигапиксельные WSI (десятки тысяч px по стороне),
	// маска на полное разрешение не выделяется («Array buffer allocation
	// failed»). `maskScaleFor` ужимает её до безопасного размера; при
	// рисовании и переводе контура в пиксели изображения это учитывается.
	const maskScale = useMemo(
		() => (tileSource?.width && tileSource?.height ? maskScaleFor(tileSource.width, tileSource.height) : 1),
		[tileSource?.width, tileSource?.height],
	)

	// Маска живёт в координатах снимка (с поправкой на maskScale), поэтому её
	// размер зависит от размера снимка.
	useEffect(() => {
		if (!tileSource?.width || !tileSource?.height) {
			setMask(null)
			return
		}
		setMask(createMask(tileSource.width * maskScale, tileSource.height * maskScale))
		setSketchVersion(v => v + 1)
	}, [tileSource?.width, tileSource?.height, maskScale])

	// Ссылка на массив должна быть стабильной: общий вьюер пересоздаёт инстанс
	// OSD при смене `images`, а вместе с инстансом уходит и слой разметки.
	const images = useMemo<ViewerImage[]>(
		() => (tileSource ? [{ id: imageUrl ?? '', url: '', tileSource: tileSource as ViewerImage['tileSource'] }] : []),
		[imageUrl, tileSource],
	)

	const style = useMemo(
		() =>
			createSelectStyleFromConfig(segmentTypeColors, {
				isEditMode: segmentToolsEnabled,
				activeSegmentType: currentSegment,
			}),
		[segmentTypeColors, segmentToolsEnabled, currentSegment],
	)

	const visibleSegments = useMemo(() => (showSegments ? segments : []), [showSegments, segments])

	const { annotator, attach, detach } = useCytologyAnnotator({
		segments: visibleSegments,
		style,
		drawingEnabled: segmentToolsEnabled && selected,
		tool,
		onAddSegment: addSegment,
		onChangeSegment: changeSegment,
	})

	const viewer = annotator?.viewer ?? null

	const hasSketch = useMemo(
		() => Boolean(mask && !isMaskEmpty(mask)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[mask, sketchVersion],
	)

	const handleClearSketch = useCallback(() => {
		if (!tileSource?.width || !tileSource?.height) return
		setMask(createMask(tileSource.width * maskScale, tileSource.height * maskScale))
		setSketchVersion(v => v + 1)
	}, [tileSource?.width, tileSource?.height, maskScale])

	const handleConfirmSketch = useCallback(() => {
		if (!mask) return

		const polygon = maskToPolygon(mask, 2)
		if (!polygon) {
			message.warning('Набросок слишком мал — контур не построен')
			return
		}

		// Контур найден в пикселях маски — переводим в пиксели изображения,
		// прежде чем отдавать сегмент дальше (details/geometry ожидают
		// координаты снимка, а не уменьшенной маски).
		const contour = polygon.map(point => ({ x: Math.round(point.x / maskScale), y: Math.round(point.y / maskScale) }))

		addSegment(contour)
		message.success(`Контур создан (${contour.length} точек)`)
		handleClearSketch()
	}, [mask, maskScale, addSegment, handleClearSketch])

	const calibrating = tool === CALIBRATE_TOOL

	/**
	 * Отрезок дорисован. В режиме линейки он становится измерением, в режиме
	 * калибровки — эталоном, для которого спрашиваем длину в миллиметрах.
	 */
	const handleLineDrawn = useCallback(
		(line: MeasuredLine) => {
			if (calibrating) {
				setCalibrationPx(lineLengthPx(line))
				setCalibrationMm(null)
				return
			}
			ruler.add(line, PAGE)
		},
		[calibrating, ruler],
	)

	const applyCalibration = useCallback(() => {
		if (calibrationPx == null || calibrationMm == null) return

		const next = calcPxPerMm(calibrationPx, calibrationMm)
		if (next == null) {
			message.error('Длина должна быть больше нуля')
			return
		}

		setPxPerMm(next)
		setCalibrationPx(null)
		// Сразу возвращаем в навигацию: масштаб задают один раз.
		setTool('move')
		message.success(`Масштаб задан: ${next.toFixed(2)} px / мм`)
	}, [calibrationPx, calibrationMm])

	const overlaySlot = useMemo(
		() => (
			<>
				{needPopup && <SegmentPopup annotator={annotator} isEditingMode={segmentToolsEnabled} pxPerMm={pxPerMm} />}

				<RulerOverlay
					viewer={viewer}
					active={isRulerLikeTool(tool)}
					measurements={ruler.measurements}
					currentPage={PAGE}
					pxPerMm={pxPerMm}
					labelFor={ruler.labelFor}
					onAdd={handleLineDrawn}
					onRemove={ruler.remove}
				/>

				{segmentToolsEnabled && tool === BRUSH_TOOL && (
					<BrushCanvasOverlay
						viewer={viewer}
						mask={mask}
						radius={brushRadius}
						erasing={brushMode === 'erase'}
						scale={maskScale}
						onStrokeEnd={() => setSketchVersion(v => v + 1)}
					/>
				)}
			</>
		),
		[
			needPopup,
			annotator,
			segmentToolsEnabled,
			pxPerMm,
			viewer,
			tool,
			ruler.measurements,
			ruler.labelFor,
			ruler.remove,
			handleLineDrawn,
			mask,
			brushRadius,
			brushMode,
			maskScale,
		],
	)

	const renderStatus = () => {
		if (!imageUrl) return statusMessage('Изображение отсутствует')
		if (error) return statusMessage(`Не удалось загрузить изображение: ${error}`)
		if (isLoading || !tileSource) return statusMessage('Загрузка изображения…')
		return null
	}

	const status = renderStatus()

	return (
		// `.viewer-wrapper` (Viewer/viewer.scss) — flex-строка с center/center,
		// рассчитанная на единственного ребёнка (сам вьюер). Панель инструментов
		// поэтому в отдельном flex-column контейнере сверху, а не внутри
		// `.viewer-wrapper` — иначе оба элемента сжимались бы в один ряд.
		<div
			className={className}
			style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 }}
		>
			<EditPanel
				tool={tool}
				setTool={setTool}
				segmentToolsEnabled={segmentToolsEnabled}
				pxPerMm={pxPerMm}
				onResetScale={() => {
					setPxPerMm(null)
					setTool(CALIBRATE_TOOL)
				}}
				brushMode={brushMode}
				onBrushModeChange={setBrushMode}
				brushRadius={brushRadius}
				onBrushRadiusChange={setBrushRadius}
				hasSketch={hasSketch}
				onConfirmSketch={handleConfirmSketch}
				onClearSketch={handleClearSketch}
				measurementCount={ruler.measurements.filter(item => item.page === PAGE).length}
				onClearMeasurements={ruler.clear}
			/>

			<div className='viewer-wrapper'>
				{status ?? (
					<UziViewer
						images={images}
						height={height}
						toolbarConfig={TOOLBAR_CONFIG}
						navigationEnabled={false}
						onInstanceReady={attach}
						onInstanceWillDestroy={detach}
						overlaySlot={overlaySlot}
						emptyState={statusMessage('Изображение отсутствует')}
						customToolbarSlot={
							<SegmentsVisibilityToggle visible={showSegments} onToggle={() => setShowSegments(v => !v)} />
						}
					/>
				)}
			</div>

			<Modal
				title='Длина эталонного отрезка'
				open={calibrationPx != null}
				onOk={applyCalibration}
				onCancel={() => setCalibrationPx(null)}
				okText='Применить'
				cancelText='Отмена'
				okButtonProps={{ disabled: calibrationMm == null || calibrationMm <= 0 }}
				destroyOnHidden
			>
				<Typography.Paragraph type='secondary'>
					Вы провели отрезок длиной {calibrationPx?.toFixed(0)} px. Укажите, скольким миллиметрам
					он соответствует по шкале снимка.
				</Typography.Paragraph>

				<InputNumber
					autoFocus
					value={calibrationMm ?? undefined}
					onChange={value => setCalibrationMm(typeof value === 'number' ? value : null)}
					onPressEnter={applyCalibration}
					min={0.1}
					step={1}
					addonAfter='мм'
					placeholder='например, 10'
					style={{ width: '100%' }}
				/>
			</Modal>
		</div>
	)
}

export default CytologyOsdViewer
