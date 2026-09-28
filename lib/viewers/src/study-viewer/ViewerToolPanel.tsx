import React from 'react'
import { Button, InputNumber, Segmented, Space, Tooltip, Typography } from 'antd'

import { BRUSH_TOOL, CALIBRATE_TOOL, RULER_TOOL, VIEWER_TOOL_META, type BrushMode, type ViewerToolId } from './tools'

export interface ViewerToolPanelProps {
	tools: ViewerToolId[]
	activeTool: ViewerToolId
	onToolChange: (tool: ViewerToolId) => void

	pxPerMm: number | null
	onResetScale: () => void

	brushMode: BrushMode
	onBrushModeChange: (mode: BrushMode) => void
	brushRadius: number
	onBrushRadiusChange: (radius: number) => void

	/** Есть незакоммиченный набросок кистью. */
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
	onResetScale,
	brushMode,
	onBrushModeChange,
	brushRadius,
	onBrushRadiusChange,
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
							<Tooltip key={tool} title={disabled ? 'Сначала задайте масштаб по отрезку' : meta.hint}>
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
					<Space size={8} align='center'>
						<Typography.Text type='secondary' style={{ whiteSpace: 'nowrap' }}>
							Масштаб
						</Typography.Text>
						{pxPerMm == null ? (
							<Button type='primary' ghost onClick={() => onToolChange(CALIBRATE_TOOL)}>
								Задать по отрезку
							</Button>
						) : (
							<>
								<Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
									{pxPerMm.toFixed(2)} px / мм
								</Typography.Text>
								<Button size='small' onClick={onResetScale}>
									Задать заново
								</Button>
							</>
						)}
					</Space>
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

					<Space size={8} wrap>
						<Button onClick={onClearSketch} disabled={!hasSketch}>
							Очистить набросок
						</Button>
						<Button type='primary' onClick={onConfirmSketch} disabled={!hasSketch}>
							Подтвердить
						</Button>
					</Space>
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

export default ViewerToolPanel
