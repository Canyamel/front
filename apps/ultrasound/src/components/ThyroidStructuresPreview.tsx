import React, { useMemo } from 'react'
import { Card, Segmented, Space, Typography, Tag, Empty } from 'antd'
import type { ThyroidStructureJson } from '@/features/thyroid-results/demoThyroidStructures'

interface ThyroidStructuresPreviewProps {
	structures: ThyroidStructureJson
	width?: number
	height?: number
}

const STRUCTURE_COLORS = {
	left_lobe: '#FF6B9D',
	right_lobe: '#4ECDC4',
	isthmus: '#FFE66D',
}

const STRUCTURE_LABELS = {
	left_lobe: 'Левая доля',
	right_lobe: 'Правая доля',
	isthmus: 'Перешеек',
}

export default function ThyroidStructuresPreview({
	structures,
	width = 600,
	height = 400,
}: ThyroidStructuresPreviewProps) {
	const frameKeys = useMemo(
		() =>
			Object.keys(structures)
				.filter(key => key !== 'view_type')
				.sort(),
		[structures],
	)

	const [selectedFrame, setSelectedFrame] = React.useState<string>(
		frameKeys[0] || '0',
	)

	const currentFrameData = structures[selectedFrame]

	const renderStructures = () => {
		if (!currentFrameData) {
			return (
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
					<Empty description='Нет данных для кадра' />
				</div>
			)
		}

		// Ищем границы для масштабирования
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity

		Object.values(currentFrameData).forEach((struct: any) => {
			if (struct.coords) {
				struct.coords.forEach(([x, y]: number[]) => {
					minX = Math.min(minX, x)
					minY = Math.min(minY, y)
					maxX = Math.max(maxX, x)
					maxY = Math.max(maxY, y)
				})
			}
		})

		if (!isFinite(minX)) {
			return (
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
					<Empty description='Нет координат' />
				</div>
			)
		}

		const paddingRatio = 0.1
		const dataWidth = maxX - minX
		const dataHeight = maxY - minY
		const padding = Math.max(dataWidth, dataHeight) * paddingRatio

		const boundedWidth = dataWidth + padding * 2
		const boundedHeight = dataHeight + padding * 2

		const scaleX = (width * 0.95) / boundedWidth
		const scaleY = (height * 0.95) / boundedHeight
		const scale = Math.min(scaleX, scaleY)

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
					<pattern
						id='grid'
						width={40}
						height={40}
						patternUnits='userSpaceOnUse'
					>
						<path
							d='M 40 0 L 0 0 0 40'
							fill='none'
							stroke='#404040'
							strokeWidth='0.5'
						/>
					</pattern>
				</defs>
				<rect width={width} height={height} fill='url(#grid)' />

				{Object.entries(currentFrameData).map(
					([structName, struct]: [string, any]) => {
						if (!struct.coords || struct.coords.length < 3) return null

						const coords = struct.coords as Array<number[]>
						const translated = coords.map(([x, y]) => ({
							x: x * scale - (minX - padding) * scale,
							y: y * scale - (minY - padding) * scale,
						}))

						const points = translated.map(({ x, y }) => `${x},${y}`).join(' ')

						const color =
							STRUCTURE_COLORS[structName as keyof typeof STRUCTURE_COLORS] ||
							'#0077CC'

						const first = translated[0]

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
											{STRUCTURE_LABELS[
												structName as keyof typeof STRUCTURE_LABELS
											] || structName}
										</text>
										{struct.confidence && (
											<text
												x={first.x}
												y={first.y + 15}
												fill='#aaa'
												fontSize='11'
												textAnchor='start'
											>
												{(struct.confidence * 100).toFixed(1)}%
											</text>
										)}
									</>
								)}
							</g>
						)
					},
				)}
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
					<Space
						direction='vertical'
						style={{ width: '100%', marginBottom: 16 }}
					>
						<Typography.Text type='secondary'>Кадр:</Typography.Text>
						<Segmented
							value={selectedFrame}
							onChange={v => setSelectedFrame(String(v))}
							options={frameKeys.map(key => ({
								label: `Кадр ${key}`,
								value: key,
							}))}
							block
						/>
					</Space>
				)}

				<div style={{ display: 'flex', justifyContent: 'center' }}>
					{renderStructures()}
				</div>

				{currentFrameData && (
					<Space
						direction='vertical'
						style={{ width: '100%', marginTop: 16 }}
						size={8}
					>
						<Typography.Text strong>Структуры в кадре:</Typography.Text>
						<Space wrap>
							{Object.entries(currentFrameData).map(
								([structName, struct]: [string, any]) => (
									<Tag
										key={structName}
										color={
											STRUCTURE_COLORS[
												structName as keyof typeof STRUCTURE_COLORS
											]
										}
									>
										{STRUCTURE_LABELS[
											structName as keyof typeof STRUCTURE_LABELS
										] || structName}
										{struct.confidence &&
											` (${(struct.confidence * 100).toFixed(1)}%)`}
									</Tag>
								),
							)}
						</Space>
					</Space>
				)}
			</Card>
		</Space>
	)
}
