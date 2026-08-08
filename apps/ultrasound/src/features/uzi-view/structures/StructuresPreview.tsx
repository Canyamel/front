import React, { useMemo } from 'react'
import { Card, Segmented, Space, Typography, Tag, Empty } from 'antd'
import {
	getStructureFrame,
	getStructureFrameKeys,
	type ThyroidStructureFrame,
	type ThyroidStructureJson,
} from './types'

interface ThyroidStructuresPreviewProps {
	structures: ThyroidStructureJson
	width?: number
	height?: number
}

const STRUCTURE_COLORS: Record<string, string> = {
	left_lobe: '#FF6B9D',
	right_lobe: '#4ECDC4',
	isthmus: '#FFE66D',
}

const STRUCTURE_LABELS: Record<string, string> = {
	left_lobe: 'Левая доля',
	right_lobe: 'Правая доля',
	isthmus: 'Перешеек',
}

const DEFAULT_COLOR = '#0077CC'
const PADDING_RATIO = 0.1

const structureColor = (name: string) => STRUCTURE_COLORS[name] ?? DEFAULT_COLOR
const structureLabel = (name: string) => STRUCTURE_LABELS[name] ?? name

interface FrameTransform {
	scale: number
	offsetX: number
	offsetY: number
}

/**
 * Чистая геометрия: считает масштаб и сдвиг, чтобы вписать все контуры кадра
 * в область width×height. Вынесена из JSX, чтобы разметка осталась
 * презентационной, а математику можно было проверить отдельно.
 */
function computeFrameTransform(
	frame: ThyroidStructureFrame,
	width: number,
	height: number,
): FrameTransform | null {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const structure of Object.values(frame)) {
		for (const [x, y] of structure.coords ?? []) {
			minX = Math.min(minX, x)
			minY = Math.min(minY, y)
			maxX = Math.max(maxX, x)
			maxY = Math.max(maxY, y)
		}
	}

	if (!isFinite(minX)) return null

	const dataWidth = maxX - minX
	const dataHeight = maxY - minY
	const padding = Math.max(dataWidth, dataHeight) * PADDING_RATIO
	const scale = Math.min(
		(width * 0.95) / (dataWidth + padding * 2),
		(height * 0.95) / (dataHeight + padding * 2),
	)

	return {
		scale,
		offsetX: (minX - padding) * scale,
		offsetY: (minY - padding) * scale,
	}
}

const PlaceholderBox: React.FC<{
	width: number
	height: number
	description: string
}> = ({ width, height, description }) => (
	<div
		style={{
			width,
			height,
			backgroundColor: '#f0f2f5',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		}}
	>
		<Empty description={description} />
	</div>
)

export default function ThyroidStructuresPreview({
	structures,
	width = 600,
	height = 400,
}: ThyroidStructuresPreviewProps) {
	const frameKeys = useMemo(() => getStructureFrameKeys(structures), [structures])
	const [selectedFrame, setSelectedFrame] = React.useState<string>(frameKeys[0] || '0')

	const currentFrame = getStructureFrame(structures, selectedFrame)
	const transform = useMemo(
		() => (currentFrame ? computeFrameTransform(currentFrame, width, height) : null),
		[currentFrame, width, height],
	)

	const renderStructures = () => {
		if (!currentFrame) {
			return (
				<PlaceholderBox width={width} height={height} description='Нет данных для кадра' />
			)
		}

		if (!transform) {
			return <PlaceholderBox width={width} height={height} description='Нет координат' />
		}

		const { scale, offsetX, offsetY } = transform

		return (
			<svg
				width={width}
				height={height}
				style={{
					backgroundColor: '#1f1f1f',
					border: '1px solid #d9d9d9',
					borderRadius: 4,
				}}
			>
				<defs>
					<pattern id='grid' width={40} height={40} patternUnits='userSpaceOnUse'>
						<path d='M 40 0 L 0 0 0 40' fill='none' stroke='#404040' strokeWidth='0.5' />
					</pattern>
				</defs>
				<rect width={width} height={height} fill='url(#grid)' />

				{Object.entries(currentFrame).map(([structName, structure]) => {
					if (!structure.coords || structure.coords.length < 3) return null

					const translated = structure.coords.map(([x, y]) => ({
						x: x * scale - offsetX,
						y: y * scale - offsetY,
					}))
					const points = translated.map(({ x, y }) => `${x},${y}`).join(' ')
					const color = structureColor(structName)
					const [first] = translated

					return (
						<g key={structName}>
							<polygon
								points={points}
								fill={color}
								fillOpacity='0.3'
								stroke={color}
								strokeWidth='2'
								strokeLinejoin='round'
							/>
							{first && (
								<>
									<text
										x={first.x}
										y={first.y - 5}
										fill='white'
										fontSize='12'
										fontWeight='bold'
										textAnchor='start'
									>
										{structureLabel(structName)}
									</text>
									{structure.confidence && (
										<text
											x={first.x}
											y={first.y + 15}
											fill='#aaa'
											fontSize='11'
											textAnchor='start'
										>
											{(structure.confidence * 100).toFixed(1)}%
										</text>
									)}
								</>
							)}
						</g>
					)
				})}
			</svg>
		)
	}

	return (
		<Space direction='vertical' style={{ width: '100%' }} size={16}>
			<Card
				title={`Превью структур (${structures.view_type})`}
				size='small'
				style={{ borderRadius: 8 }}
			>
				{frameKeys.length > 1 && (
					<Space direction='vertical' style={{ width: '100%', marginBottom: 16 }}>
						<Typography.Text type='secondary'>Кадр:</Typography.Text>
						<Segmented
							value={selectedFrame}
							onChange={v => setSelectedFrame(String(v))}
							options={frameKeys.map(key => ({ label: `Кадр ${key}`, value: key }))}
							block
						/>
					</Space>
				)}

				<div style={{ display: 'flex', justifyContent: 'center' }}>{renderStructures()}</div>

				{currentFrame && (
					<Space direction='vertical' style={{ width: '100%', marginTop: 16 }} size={8}>
						<Typography.Text strong>Структуры в кадре:</Typography.Text>
						<Space wrap>
							{Object.entries(currentFrame).map(([structName, structure]) => (
								<Tag key={structName} color={structureColor(structName)}>
									{structureLabel(structName)}
									{structure.confidence &&
										` (${(structure.confidence * 100).toFixed(1)}%)`}
								</Tag>
							))}
						</Space>
					</Space>
				)}
			</Card>
		</Space>
	)
}
