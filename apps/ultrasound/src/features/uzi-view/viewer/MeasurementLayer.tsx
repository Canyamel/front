import React from 'react'
import { imageToElementPoint, type ViewerInstance } from '@medml/viewers'
import { lineLabelAnchor } from './measurement'
import type { RulerMeasurement } from './useRulerMeasurements'

export interface MeasurementLayerProps {
	viewer: ViewerInstance | null
	measurements: RulerMeasurement[]
	currentPage: number
	pxPerMm: number | null
	labelFor: (measurement: RulerMeasurement, pxPerMm: number | null) => string | null
	onRemove: (id: string) => void
}

/**
 * Слой измерительных линий поверх снимка.
 *
 * Рисуется своим SVG, а не аннотациями Annotorious: измерения не должны
 * попадать в черновики контуров. Координаты хранятся в системе изображения
 * и пересчитываются в экранные при каждом движении вьюпорта, поэтому линии
 * держатся за снимок при зуме и панорамировании.
 */
const MeasurementLayer: React.FC<MeasurementLayerProps> = ({
	viewer,
	measurements,
	currentPage,
	pxPerMm,
	labelFor,
	onRemove,
}) => {
	// Пересчёт при движении вьюпорта: собственного состояния у слоя нет,
	// поэтому просто заставляем перерисоваться.
	const [, forceRedraw] = React.useReducer(x => x + 1, 0)

	React.useEffect(() => {
		if (!viewer) return

		const handler = () => forceRedraw()
		viewer.addHandler('animation', handler)
		viewer.addHandler('resize', handler)
		viewer.addHandler('open', handler)

		return () => {
			viewer.removeHandler('animation', handler)
			viewer.removeHandler('resize', handler)
			viewer.removeHandler('open', handler)
		}
	}, [viewer])

	const visible = measurements.filter(item => item.page === currentPage)
	if (!viewer || visible.length === 0) return null

	return (
		<svg
			className='measurement-layer'
			style={{
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				zIndex: 950,
				// Кликабельны только сами линии, чтобы слой не перехватывал
				// рисование и панорамирование.
				pointerEvents: 'none',
			}}
		>
			{visible.map(measurement => {
				const start = imageToElementPoint(
					viewer,
					measurement.line.x1,
					measurement.line.y1,
				)
				const end = imageToElementPoint(viewer, measurement.line.x2, measurement.line.y2)
				if (!start || !end) return null

				const anchorImage = lineLabelAnchor(measurement.line, 14)
				const anchor = imageToElementPoint(viewer, anchorImage.x, anchorImage.y)
				const label = labelFor(measurement, pxPerMm)

				return (
					<g key={measurement.id}>
						<line
							x1={start.x}
							y1={start.y}
							x2={end.x}
							y2={end.y}
							stroke='#06B6D4'
							strokeWidth={2}
							strokeLinecap='round'
						/>
						{/* Засечки на концах — видно, где именно замерено. */}
						{[start, end].map((point, index) => (
							<circle
								key={index}
								cx={point.x}
								cy={point.y}
								r={4}
								fill='#FFFFFF'
								stroke='#06B6D4'
								strokeWidth={2}
							/>
						))}

						{label && anchor && (
							<text
								className='measurement-label'
								x={anchor.x}
								y={anchor.y}
								textAnchor='middle'
								dominantBaseline='middle'
								transform={`rotate(${anchorImage.angleDeg} ${anchor.x} ${anchor.y})`}
							>
								{label}
							</text>
						)}

						{/* Крестик удаления у конца отрезка. */}
						<g
							style={{ pointerEvents: 'auto', cursor: 'pointer' }}
							onClick={() => onRemove(measurement.id)}
						>
							<circle cx={end.x + 14} cy={end.y - 14} r={9} fill='#E11D48' />
							<text
								x={end.x + 14}
								y={end.y - 14}
								textAnchor='middle'
								dominantBaseline='central'
								fill='#FFFFFF'
								fontSize={12}
								fontWeight='bold'
							>
								×
							</text>
						</g>
					</g>
				)
			})}
		</svg>
	)
}

export default MeasurementLayer
