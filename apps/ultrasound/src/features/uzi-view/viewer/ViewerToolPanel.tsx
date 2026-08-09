import React from 'react'
import { Button, InputNumber, Segmented, Space, Tooltip, Typography } from 'antd'
import {
	BRUSH_TOOL,
	PAN_TOOL,
	RULER_TOOL,
	type BrushMode,
	type ViewerToolId,
} from './constants'

export interface ViewerToolPanelProps {
	activeTool: ViewerToolId
	onToolChange: (tool: ViewerToolId) => void

	/** Сколько пикселей в миллиметре; задаётся врачом вручную. */
	pxPerMm: number | null
	onPxPerMmChange: (value: number | null) => void

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
}

const TOOLS: Array<{ value: ViewerToolId; label: string; hint: string }> = [
	{ value: PAN_TOOL, label: 'Навигация', hint: 'Перемещение и масштаб снимка' },
	{ value: 'polygon', label: 'Контур', hint: 'Обвести узел по точкам' },
	{ value: 'freehand', label: 'Обводка', hint: 'Векторная обводка от руки' },
	{ value: BRUSH_TOOL, label: 'Кисть', hint: 'Закрасить область, затем «Подтвердить»' },
	{ value: RULER_TOOL, label: 'Линейка', hint: 'Зажмите и протяните по снимку — размер покажется сразу' },
]

/**
 * Панель инструментов над снимком.
 *
 * Вынесена из тулбара внутри вьюера: инструментов стало больше, чем помещается
 * в узкую плавающую панель, а поле масштаба и кнопки подтверждения кисти
 * требуют полноценного ввода.
 */
const ViewerToolPanel: React.FC<ViewerToolPanelProps> = ({
	activeTool,
	onToolChange,
	pxPerMm,
	onPxPerMmChange,
	brushMode,
	onBrushModeChange,
	brushRadius,
	onBrushRadiusChange,
	hasSketch,
	onConfirmSketch,
	onClearSketch,
	measurementCount,
	onClearMeasurements,
}) => {
	const rulerDisabled = pxPerMm == null

	return (
		<div className='viewer-tool-panel'>
			<div className='viewer-tool-panel__row'>
				<Space size={8} wrap>
					{TOOLS.map(tool => {
						const disabled = tool.value === RULER_TOOL && rulerDisabled
						const button = (
							<Button
								key={tool.value}
								type={activeTool === tool.value ? 'primary' : 'default'}
								disabled={disabled}
								onClick={() => onToolChange(tool.value)}
							>
								{tool.label}
							</Button>
						)
						return (
							<Tooltip
								key={tool.value}
								title={
									disabled
										? 'Сначала задайте масштаб px / мм'
										: tool.hint
								}
							>
								{button}
							</Tooltip>
						)
					})}
				</Space>

				<Space size={8} align='center'>
					<Typography.Text type='secondary' style={{ whiteSpace: 'nowrap' }}>
						Масштаб, px / мм
					</Typography.Text>
					<InputNumber
						value={pxPerMm ?? undefined}
						onChange={value => onPxPerMmChange(typeof value === 'number' ? value : null)}
						min={0.01}
						step={0.1}
						placeholder='напр. 5.2'
						style={{ width: 120 }}
					/>
				</Space>
			</div>

			{activeTool === BRUSH_TOOL && (
				<div className='viewer-tool-panel__row viewer-tool-panel__row--secondary'>
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
				<div className='viewer-tool-panel__row viewer-tool-panel__row--secondary'>
					<Typography.Text type='secondary'>
						Измерений на кадре: {measurementCount}
					</Typography.Text>
					<Button size='small' onClick={onClearMeasurements}>
						Убрать измерения
					</Button>
				</div>
			)}
		</div>
	)
}

export default ViewerToolPanel
