import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { InputNumber, Modal, Typography, message } from 'antd'

import UziViewer from '../uzi-viewer/UziViewer'
import type { ViewerImage, ViewerInstance } from '../uzi-viewer/types'
import type { PlanePoint } from '../geometry'
import { BrushCanvasOverlay, createMask, fillPolygon, isMaskEmpty, maskToPolygon, type BrushMask } from '../brush'
import {
	RulerOverlay,
	calcPxPerMm,
	lineLengthPx,
	pxPerMmFromSpacing,
	sameScale,
	useRulerMeasurements,
	type MeasuredLine,
} from '../measurement'
import ViewerToolPanel, { formatPxPerMm } from './ViewerToolPanel'
import ViewerStatusState from './ViewerStatusState'
import ViewerLegendOverlay from './ViewerLegendOverlay'
import ViewerAnnotationsToggle from './ViewerAnnotationsToggle'
import ViewerAnnotationPopup from './ViewerAnnotationPopup'
import ViewerSnapshotSaveTarget from './ViewerSnapshotSaveTarget'
import { annotationAnchor, useAnnotoriousLayer } from '../annotations'
import {
	BRUSH_TOOL,
	CALIBRATE_TOOL,
	DEFAULT_VIEWER_TOOLS,
	PAN_TOOL,
	isDrawingTool,
	isReadOnlyTool,
	isRulerLikeTool,
	type BrushMode,
	type ViewerToolId,
} from './tools'
import type { AnnotatedStudyViewerProps } from './types'

/**
 * Рабочее место врача над снимком — один компонент для всех 2D-контуров.
 *
 * Собирает в одно целое то, что раньше было разведено по приложениям:
 *
 * - движок просмотра (`<UziViewer />`: zoom/pan/rotate/постранично);
 * - панель инструментов с общим набором id (`ViewerToolPanel`);
 * - линейку и задание масштаба по эталонному отрезку (`RulerOverlay`);
 * - кисть-заполнение с превращением наброска в контур (`BrushCanvasOverlay`);
 * - разметку на Annotorious 3 (`useAnnotoriousLayer`): приложение отдаёт
 *   контуры и получает обратно правки врача;
 * - легенду разметки и переключатель её видимости;
 * - «Сохранить картинку как» с разметкой (`ViewerSnapshotSaveTarget`);
 * - состояния «загрузка / ошибка / нет снимка».
 */
function AnnotatedStudyViewer<D = unknown>({
	images,
	annotations,
	annotationStyle,
	onAnnotationChange,
	newAnnotationData,
	canDraw = true,
	brushTarget,
	renderAnnotationPopup,
	annotationApiRef,
	tools = DEFAULT_VIEWER_TOOLS,
	activeTool: controlledTool,
	onToolChange,
	readOnly = true,
	height = 600,
	className,
	navigationEnabled = true,
	onIndexChange,
	status,
	legendItems = [],
	legendTitle,
	onPxPerMmChange,
	initialPxPerMm = null,
	filePixelSpacing,
	annotationsVisible,
	onAnnotationsVisibleChange,
	annotationsToggleLabel,
	zoomLimits,
	zoomUnit,
	overlaySlot,
	customToolbarSlot,
	toolPanelExtra,
}: AnnotatedStudyViewerProps<D>) {
	const [osdViewer, setOsdViewer] = useState<ViewerInstance | null>(null)
	const [currentPage, setCurrentPage] = useState(0)

	// Инструмент можно вести снаружи, но обычно это внутреннее состояние:
	// приложению интересен результат разметки, а не выбранный инструмент.
	const [internalTool, setInternalTool] = useState<ViewerToolId>(PAN_TOOL)
	const requestedTool = controlledTool ?? internalTool

	const availableTools = useMemo(() => (readOnly ? tools.filter(isReadOnlyTool) : tools), [readOnly, tools])

	const activeTool = availableTools.includes(requestedTool) ? requestedTool : PAN_TOOL

	// Масштаб из метаданных файла. Пока врач не калибровал вручную, линейка
	// и размеры работают по нему — калибровка нужна только файлам без него.
	const fileHorizontal = filePixelSpacing?.horizontal ?? null
	const fileVertical = filePixelSpacing?.vertical ?? null
	const filePxPerMm = useMemo(
		() => pxPerMmFromSpacing({ horizontal: fileHorizontal, vertical: fileVertical }),
		[fileHorizontal, fileVertical],
	)
	const startPxPerMm = initialPxPerMm ?? filePxPerMm

	const [pxPerMm, setPxPerMm] = useState<number | null>(startPxPerMm)

	// Сохранённый масштаб может прийти позже снимка или смениться вместе с
	// исследованием.
	useEffect(() => {
		setPxPerMm(startPxPerMm)
	}, [startPxPerMm])

	const scaleSource = pxPerMm == null ? null : sameScale(pxPerMm, filePxPerMm) ? 'file' : 'manual'
	const handleUseFileScale = useCallback(() => {
		if (filePxPerMm == null) return
		setPxPerMm(filePxPerMm)
		message.success(`Масштаб из файла: ${formatPxPerMm(filePxPerMm)}`)
	}, [filePxPerMm])

	// Отрезок, для которого ждём ввод длины. Пока он не null — открыт диалог.
	const [calibrationPx, setCalibrationPx] = useState<number | null>(null)
	const [calibrationMm, setCalibrationMm] = useState<number | null>(null)

	const [brushMode, setBrushMode] = useState<BrushMode>('draw')
	const [brushRadius, setBrushRadius] = useState(12)
	const [mask, setMask] = useState<BrushMask | null>(null)
	const [sketchVersion, setSketchVersion] = useState(0)

	const ruler = useRulerMeasurements()

	const hasAnnotations = annotations !== undefined
	const annotationLayer = useAnnotoriousLayer<D>({
		enabled: hasAnnotations,
		annotations: annotations ?? EMPTY_ANNOTATIONS,
		readOnly,
		canDraw,
		style: annotationStyle,
		createData: newAnnotationData,
		onChange: onAnnotationChange,
	})
	const {
		layer,
		setTool: setLayerTool,
		addPolygon,
		replacePolygon,
		remove: removeAnnotation,
		commitSelection,
	} = annotationLayer

	useImperativeHandle(annotationApiRef, () => ({ commitSelection }), [commitSelection])

	const handleToolChange = useCallback(
		(tool: ViewerToolId) => {
			setInternalTool(tool)
			onToolChange?.(tool)
		},
		[onToolChange],
	)

	useEffect(() => {
		onPxPerMmChange?.(pxPerMm)
	}, [pxPerMm, onPxPerMmChange])

	// Рисовать слоем разметки можно только его собственными инструментами:
	// на навигации, кисти и линейке он обязан отдать перетаскивание вьюеру.
	const drawingEnabled = !readOnly && isDrawingTool(activeTool)

	const brushActive = !readOnly && activeTool === BRUSH_TOOL && availableTools.includes(BRUSH_TOOL)

	// Кисть правит готовый контур (`brushTarget`), а не рисует набросок.
	const liveBrush = brushTarget !== undefined
	const brushTargetId = brushTarget?.annotationId ?? null
	const brushTargetPoints = useMemo(
		() => (liveBrush && brushTargetId ? (annotations?.find(item => item.id === brushTargetId)?.points ?? null) : null),
		[liveBrush, brushTargetId, annotations],
	)
	const brushTargetShape = useMemo(
		() => (brushTargetPoints ? polygonShape(brushTargetPoints) : null),
		[brushTargetPoints],
	)

	// Набросок привязан к кадру: при переходе на другой кадр он теряет смысл.
	useEffect(() => {
		if (liveBrush) return
		setMask(null)
		setSketchVersion(v => v + 1)
	}, [liveBrush, images, currentPage])

	/**
	 * Маску создаём только когда врач взял кисть, и держим до смены кадра —
	 * переключение инструментов набросок не теряет.
	 *
	 * Аллокация ленивая не ради экономии: маска привязана к размерам снимка, а
	 * цитология открывает whole-slide изображения в десятки тысяч пикселей по
	 * стороне. Создавать под них растр при обычном просмотре нельзя — именно на
	 * этом страница падала с `RangeError: Array buffer allocation failed`.
	 * (Сам растр вдобавок ограничен по размеру — см. `createMask`.)
	 */
	useEffect(() => {
		if (!brushActive || liveBrush) return

		const frame = images[currentPage]
		const { width, height } = frame ?? {}
		if (!width || !height) return

		setMask(prev => prev ?? createMask(width, height))
	}, [brushActive, liveBrush, images, currentPage])

	const brushSeedRef = useRef<{ images: ViewerImage[]; page: number; id: string | null; shape: string | null } | null>(
		null,
	)
	const brushWriteRef = useRef<{ id: string; shape: string } | null>(null)
	// Контур, который правят мазки. Сразу после создания приложение ещё не
	// вернуло его в `brushTarget`, поэтому id держим и здесь.
	const liveTargetRef = useRef<string | null>(brushTargetId)

	useEffect(() => {
		liveTargetRef.current = brushTargetId
	}, [brushTargetId])

	useEffect(() => {
		if (!brushActive || !liveBrush) {
			brushSeedRef.current = null
			return
		}

		const frame = images[currentPage]
		const { width, height } = frame ?? {}
		if (!width || !height) return

		const seed = brushSeedRef.current
		const sameFrame = seed != null && seed.images === images && seed.page === currentPage
		const unchanged = sameFrame && seed.id === brushTargetId && seed.shape === brushTargetShape
		const written = brushWriteRef.current
		const ownWrite = sameFrame && written != null && written.id === brushTargetId && written.shape === brushTargetShape
		brushSeedRef.current = { images, page: currentPage, id: brushTargetId, shape: brushTargetShape }
		if (unchanged || ownWrite) return

		const next = createMask(width, height)
		if (brushTargetPoints) fillPolygon(next, brushTargetPoints)
		brushWriteRef.current = null
		setMask(next)
		setSketchVersion(v => v + 1)
	}, [brushActive, liveBrush, images, currentPage, brushTargetId, brushTargetShape, brushTargetPoints])

	// Маркеры правки вершин мешают кисти, а незаконченная правка вершин
	// перезаписала бы мазок — снимаем выделение, когда берут кисть.
	useEffect(() => {
		if (brushActive) void commitSelection()
	}, [brushActive, commitSelection])

	useEffect(() => {
		setLayerTool(activeTool, drawingEnabled)
	}, [activeTool, drawingEnabled, setLayerTool])

	// Маска мутируется на месте, поэтому ссылка не меняется и React сам
	// пересчитать не может — версию наброска двигают штрихи и очистка.
	const hasSketch = useMemo(
		() => Boolean(mask && !isMaskEmpty(mask)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[mask, sketchVersion],
	)

	const handleClearSketch = useCallback(() => {
		const frame = images[currentPage]
		if (!frame?.width || !frame?.height) return
		setMask(createMask(frame.width, frame.height))
		setSketchVersion(v => v + 1)
	}, [images, currentPage])

	const handleConfirmSketch = useCallback(() => {
		if (!mask) return

		if (!hasAnnotations) {
			message.warning('У этого снимка нет разметки — контур некуда добавить')
			return
		}

		const polygon = maskToPolygon(mask, 2)
		if (!polygon) {
			message.warning('Набросок слишком мал — контур не построен')
			return
		}

		if (addPolygon(polygon)) {
			message.success(`Контур создан (${polygon.length} точек)`)
			handleClearSketch()
			return
		}

		message.warning('Контур не сохранён: разметку сейчас некуда добавить')
	}, [mask, hasAnnotations, addPolygon, handleClearSketch])

	/** Мазок закончен. В режиме правки контура он сразу меняет контур. */
	const handleStrokeEnd = useCallback(() => {
		setSketchVersion(v => v + 1)
		if (!liveBrush || !mask) return

		const target = liveTargetRef.current
		const polygon = maskToPolygon(mask, 2)

		if (!polygon) {
			if (target && isMaskEmpty(mask)) {
				removeAnnotation(target)
				liveTargetRef.current = null
				brushWriteRef.current = null
				message.info('Контур на этом кадре стёрт')
			} else if (!isMaskEmpty(mask)) {
				message.warning('Область слишком мала для контура')
			}
			return
		}

		if (target) {
			if (replacePolygon(target, polygon)) brushWriteRef.current = { id: target, shape: polygonShape(polygon) }
			else message.warning('Контур не изменён: включите показ разметки на снимке')
			return
		}

		const id = addPolygon(polygon)
		if (id) {
			liveTargetRef.current = id
			brushWriteRef.current = { id, shape: polygonShape(polygon) }
		} else {
			message.warning('Контур некуда добавить: выберите, к чему он относится')
		}
	}, [liveBrush, mask, removeAnnotation, replacePolygon, addPolygon])

	const calibrating = activeTool === CALIBRATE_TOOL

	/**
	 * Отрезок дорисован. В режиме линейки он становится измерением, в режиме
	 * калибровки — эталоном, для которого спрашиваем длину в миллиметрах.
	 */
	const handleLineDrawn = useCallback(
		(line: MeasuredLine, page: number) => {
			if (calibrating) {
				setCalibrationPx(lineLengthPx(line))
				setCalibrationMm(null)
				return
			}
			ruler.add(line, page)
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
		handleToolChange(PAN_TOOL)
		message.success(`Масштаб задан: ${formatPxPerMm(next)}`)
	}, [calibrationPx, calibrationMm, handleToolChange])

	const handleIndexChange = useCallback(
		(index: number) => {
			setCurrentPage(index)
			onIndexChange?.(index)
		},
		[onIndexChange],
	)

	/**
	 * В постраничном режиме OpenSeadragon шлёт `open` на каждую смену кадра, и
	 * `onInstanceReady` приходит столько же раз. Слой разметки подключается к
	 * инстансу ровно один раз (повторный `attach` к тому же инстансу ничего не
	 * делает), кадры дальше переключаются сменой `annotations`.
	 */
	const hasAnnotationsRef = useRef(hasAnnotations)
	useEffect(() => {
		hasAnnotationsRef.current = hasAnnotations
		if (hasAnnotations && osdViewer) layer.attach(osdViewer)
	}, [hasAnnotations, osdViewer, layer])

	const handleInstanceReady = useCallback(
		(viewer: ViewerInstance) => {
			setOsdViewer(viewer)
			if (hasAnnotationsRef.current) layer.attach(viewer)
		},
		[layer],
	)

	const handleInstanceWillDestroy = useCallback(() => {
		layer.detach()
		setOsdViewer(null)
	}, [layer])

	const selectedAnnotation = annotationLayer.selected
	const popupAnchor = selectedAnnotation ? annotationAnchor(selectedAnnotation.points) : null

	const showRuler = isRulerLikeTool(activeTool) && availableTools.includes(activeTool)
	const showLegend = legendItems.length > 0 && annotationsVisible !== false

	/**
	 * Встроенный переключатель видимости разметки и доменные кнопки приложения
	 * живут в одном слоте, поэтому склеиваем их здесь — приложению не нужно
	 * знать, что вьюер тоже что-то в этот слот кладёт.
	 */
	const canToggleAnnotations = typeof annotationsVisible === 'boolean' && Boolean(onAnnotationsVisibleChange)

	if (status) {
		return (
			<div className={className}>
				<ViewerStatusState status={status} height={height} />
			</div>
		)
	}

	return (
		<div className={['medml-study-viewer', className].filter(Boolean).join(' ')}>
			{availableTools.length > 0 && (
				<ViewerToolPanel
					tools={availableTools}
					activeTool={activeTool}
					onToolChange={handleToolChange}
					pxPerMm={pxPerMm}
					scaleSource={scaleSource}
					onUseFileScale={filePxPerMm != null && scaleSource !== 'file' ? handleUseFileScale : undefined}
					filePixelSpacing={filePixelSpacing}
					brushMode={brushMode}
					onBrushModeChange={setBrushMode}
					brushRadius={brushRadius}
					onBrushRadiusChange={setBrushRadius}
					brushLiveHint={
						liveBrush
							? brushTargetId
								? 'Кисть расширяет контур, ластик подрезает — изменения сразу на снимке'
								: 'На этом кадре контура нет — закрасьте область, и он появится'
							: undefined
					}
					hasSketch={hasSketch}
					onConfirmSketch={handleConfirmSketch}
					onClearSketch={handleClearSketch}
					measurementCount={ruler.measurements.filter(item => item.page === currentPage).length}
					onClearMeasurements={ruler.clear}
					extra={toolPanelExtra}
				/>
			)}

			<UziViewer
				images={images}
				onIndexChange={handleIndexChange}
				toolbarConfig={{ tools: [], ...(zoomUnit ? { zoomUnit } : {}) }}
				zoomLimits={zoomLimits}
				height={height}
				readOnly={readOnly}
				navigationEnabled={navigationEnabled}
				onInstanceReady={handleInstanceReady}
				onInstanceWillDestroy={handleInstanceWillDestroy}
				emptyState={<ViewerStatusState status={{ kind: 'empty' }} height={height} />}
				overlaySlot={context => (
					<>
						{showLegend && <ViewerLegendOverlay items={legendItems} title={legendTitle} />}

						<RulerOverlay
							viewer={osdViewer}
							active={showRuler}
							measurements={ruler.measurements}
							currentPage={currentPage}
							pxPerMm={pxPerMm}
							labelFor={ruler.labelFor}
							onAdd={handleLineDrawn}
							onRemove={ruler.remove}
						/>

						{brushActive && (
							<BrushCanvasOverlay
								viewer={osdViewer}
								mask={mask}
								radius={brushRadius}
								erasing={brushMode === 'erase'}
								onStrokeEnd={handleStrokeEnd}
							/>
						)}

						{renderAnnotationPopup && selectedAnnotation && popupAnchor && (
							<ViewerAnnotationPopup viewer={osdViewer} anchor={popupAnchor}>
								{renderAnnotationPopup({
									annotation: selectedAnnotation,
									readOnly,
									remove: () => removeAnnotation(selectedAnnotation.id),
									pxPerMm,
								})}
							</ViewerAnnotationPopup>
						)}

						<ViewerSnapshotSaveTarget<D>
							viewer={osdViewer}
							imageUrl={images[currentPage]?.url || undefined}
							annotations={annotations ?? EMPTY_ANNOTATIONS}
							style={annotationStyle}
						/>

						{typeof overlaySlot === 'function' ? overlaySlot(context) : overlaySlot}
					</>
				)}
				customToolbarSlot={context => (
					<>
						{canToggleAnnotations && (
							<ViewerAnnotationsToggle
								label={annotationsToggleLabel}
								visible={annotationsVisible as boolean}
								onToggle={() => onAnnotationsVisibleChange?.(!annotationsVisible)}
							/>
						)}
						{typeof customToolbarSlot === 'function' ? customToolbarSlot(context) : customToolbarSlot}
					</>
				)}
			/>

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
					Вы провели отрезок длиной {calibrationPx?.toFixed(0)} px. Укажите, скольким миллиметрам он соответствует по
					шкале снимка.
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

const EMPTY_ANNOTATIONS: never[] = []

/** Форма контура с точностью до пикселя — чтобы узнать свою же запись. */
function polygonShape(points: PlanePoint[]): string {
	return points.map(point => `${Math.round(point.x)},${Math.round(point.y)}`).join(' ')
}

export default AnnotatedStudyViewer
