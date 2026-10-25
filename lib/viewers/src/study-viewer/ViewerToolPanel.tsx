import React from 'react'
import { Button, InputNumber, Segmented, Space, Tag, Tooltip, Typography } from 'antd'

import { BRUSH_TOOL, CALIBRATE_TOOL, RULER_TOOL, VIEWER_TOOL_META, type BrushMode, type ViewerToolId } from './tools'
import type { ViewerPixelSpacing } from './types'

export interface ViewerToolPanelProps {
	tools: ViewerToolId[]
	activeTool: ViewerToolId
	onToolChange: (tool: ViewerToolId) => void

	pxPerMm: number | null
	scaleSource?: 'file' | 'manual' | null
	onUseFileScale?: () => void
	/** Размер пикселя из метаданных файла; */
	filePixelSpacing?: ViewerPixelSpacing

	brushMode: BrushMode
	onBrushModeChange: (mode: BrushMode) => void
	brushRadius: number
	onBrushRadiusChange: (radius: number) => void

	brushLiveHint?: string
	hasSketch: boolean
	onConfirmSketch: () => void
	onClearSketch: () => void

	/** Сколько измерительных линий на кадре. */
	measurementCount: number
	onClearMeasurements: () => void

	/** Доменные элементы управления в той же панели (выбор группы и т.п.). */
	extra?: React.ReactNode
}

const panelStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: 12,
	padding: '12px 16px',
	marginBottom: 12,
	background: 'rgba(248, 250, 252, 0.9)',
	border: '1px solid rgba(15, 23, 42, 0.1)',
	borderRadius: 8,
}

const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: 12,
	flexWrap: 'wrap',
}

const secondaryRowStyle: React.CSSProperties = {
	...rowStyle,
	paddingTop: 12,
	borderTop: '1px solid rgba(15, 23, 42, 0.1)',
}

/**
 * Панель инструментов над снимком — одна для обоих контуров.
 */
const ViewerToolPanel: React.FC<ViewerToolPanelProps> = ({
	tools,
	activeTool,
	onToolChange,
	pxPerMm,
	scaleSource,
	onUseFileScale,
	filePixelSpacing,
	brushMode,
	onBrushModeChange,
	brushRadius,
	onBrushRadiusChange,
	brushLiveHint,
	hasSketch,
	onConfirmSketch,
	onClearSketch,
	measurementCount,
	onClearMeasurements,
	extra,
}) => {
	const rulerDisabled = pxPerMm == null

	const showScaleControls = tools.includes(CALIBRATE_TOOL) || tools.includes(RULER_TOOL)
	const showBrushControls = tools.includes(BRUSH_TOOL) && activeTool === BRUSH_TOOL

	return (
		<div className='medml-viewer-tool-panel' style={panelStyle}>
			<div style={rowStyle}>
				<Space size={8} wrap>
					{tools.map(tool => {
						const meta = VIEWER_TOOL_META[tool]
						const disabled = tool === RULER_TOOL && rulerDisabled

						return (
							<Tooltip key={tool} title={disabled ? 'Сначала задайте масштаб' : meta.hint}>
								<Button
									type={activeTool === tool ? 'primary' : 'default'}
									disabled={disabled}
									icon={meta.icon}
									onClick={() => onToolChange(tool)}
								>
									{meta.label}
								</Button>
							</Tooltip>
						)
					})}
				</Space>

				{showScaleControls && (
					<ScaleInfo
						pxPerMm={pxPerMm}
						scaleSource={scaleSource}
						onUseFileScale={onUseFileScale}
						filePixelSpacing={filePixelSpacing}
					/>
				)}
			</div>

			{extra && <div style={rowStyle}>{extra}</div>}

			{showBrushControls && (
				<div style={secondaryRowStyle}>
					<Space size={8} align='center' wrap>
						<Segmented
							value={brushMode}
							onChange={value => onBrushModeChange(value as BrushMode)}
							options={[
								{ value: 'draw', label: 'Добавить' },
								{ value: 'erase', label: 'Ластик' },
							]}
						/>

						<Typography.Text type='secondary'>Размер</Typography.Text>
						<InputNumber
							value={brushRadius}
							onChange={value => onBrushRadiusChange(Number(value) || 1)}
							min={1}
							max={80}
							style={{ width: 80 }}
						/>
					</Space>

					{brushLiveHint ? (
						<Typography.Text type='secondary'>{brushLiveHint}</Typography.Text>
					) : (
						<Space size={8} wrap>
							<Button onClick={onClearSketch} disabled={!hasSketch}>
								Очистить набросок
							</Button>
							<Button type='primary' onClick={onConfirmSketch} disabled={!hasSketch}>
								Подтвердить
							</Button>
						</Space>
					)}
				</div>
			)}

			{measurementCount > 0 && (
				<div style={secondaryRowStyle}>
					<Typography.Text type='secondary'>Измерений на кадре: {measurementCount}</Typography.Text>
					<Button size='small' onClick={onClearMeasurements}>
						Убрать измерения
					</Button>
				</div>
			)}
		</div>
	)
}

const scaleBlockStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'flex-end',
	gap: 2,
	marginLeft: 'auto',
}

const nowrap: React.CSSProperties = { whiteSpace: 'nowrap' }

interface ScaleInfoProps {
	pxPerMm: number | null
	scaleSource?: 'file' | 'manual' | null
	onUseFileScale?: () => void
	filePixelSpacing?: ViewerPixelSpacing
}

/**
 * Масштаб снимка одним блоком
 */
const ScaleInfo: React.FC<ScaleInfoProps> = ({ pxPerMm, scaleSource, onUseFileScale, filePixelSpacing }) => (
	<div style={scaleBlockStyle}>
		<Space size={8} align='center'>
			<Typography.Text type='secondary' style={nowrap}>
				Масштаб
			</Typography.Text>
			{pxPerMm == null ? (
				<Typography.Text type='warning' style={nowrap}>
					не задан
				</Typography.Text>
			) : (
				<Typography.Text strong style={nowrap}>
					{formatPxPerMm(pxPerMm)}
				</Typography.Text>
			)}
			{pxPerMm != null && scaleSource && (
				<Tag color={scaleSource === 'file' ? 'green' : 'blue'} style={{ marginInlineEnd: 0 }}>
					{scaleSource === 'file' ? 'из файла' : 'вручную'}
				</Tag>
			)}
			{onUseFileScale && (
				<Tooltip title='Вернуть масштаб из метаданных файла вместо ручной калибровки'>
					<Button type='link' size='small' onClick={onUseFileScale} style={{ paddingInline: 0 }}>
						Взять из файла
					</Button>
				</Tooltip>
			)}
		</Space>

		{filePixelSpacing && <FileSpacingLine spacing={filePixelSpacing} />}
	</div>
)

/**
 * Масштаб из метаданных файла — в тех же единицах, что и основной
 */
const FileSpacingLine: React.FC<{ spacing: ViewerPixelSpacing }> = ({ spacing }) => {
	const textStyle: React.CSSProperties = { ...nowrap, fontSize: 12 }
	const horizontal = spacing.horizontal != null && spacing.horizontal > 0 ? 1 / spacing.horizontal : null
	const vertical = spacing.vertical != null && spacing.vertical > 0 ? 1 / spacing.vertical : null

	if (horizontal == null && vertical == null) {
		return (
			<Typography.Text type='warning' style={textStyle}>
				В файле масштаба нет
			</Typography.Text>
		)
	}

	const value =
		horizontal != null && vertical != null && Math.abs(horizontal - vertical) < 0.005
			? formatPxPerMm(horizontal)
			: `${horizontal != null ? horizontal.toFixed(2) : '—'} × ${vertical != null ? vertical.toFixed(2) : '—'} ${PX_PER_MM_UNIT}`

	return (
		<Tooltip
			title={`Из метаданных файла: размер пикселя ${formatSpacing(spacing.horizontal)} × ${formatSpacing(spacing.vertical)} мм (по горизонтали × по вертикали)`}
		>
			<Typography.Text type='secondary' style={textStyle}>
				Из файла: {value}
			</Typography.Text>
		</Tooltip>
	)
}

/** Единица масштаба — одна на всю панель и сообщения. */
const PX_PER_MM_UNIT = 'пикс / мм'

/** Масштаб для показа: `19.84 пикс / мм`. */
export function formatPxPerMm(pxPerMm: number): string {
	return `${pxPerMm.toFixed(2)} ${PX_PER_MM_UNIT}`
}

/** Размер пикселя для подсказки: 4 значащие цифры без хвостовых нулей. */
function formatSpacing(value: number | null): string {
	return value != null && value > 0 ? String(Number(value.toPrecision(4))) : '—'
}

export default ViewerToolPanel
