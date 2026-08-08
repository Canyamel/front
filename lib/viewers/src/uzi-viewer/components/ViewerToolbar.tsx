import React from 'react'
import ViewerActionButton from './ViewerActionButton'
import type { ToolbarConfig } from '../types'

export interface ViewerToolbarProps {
	config?: ToolbarConfig | false
	zoom: number
	activeTool?: string
	onToolChange?: (toolId: string) => void
	onZoomIn: () => void
	onZoomOut: () => void
	onFit: () => void
	onRotateLeft: () => void
	onRotateRight: () => void
}

const dividerStyle: React.CSSProperties = {
	height: 1,
	backgroundColor: '#ddd',
	margin: '4px 0',
}

/** Панель зума, поворота и выбора активного (доменного) инструмента. */
const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
	config,
	zoom,
	activeTool,
	onToolChange,
	onZoomIn,
	onZoomOut,
	onFit,
	onRotateLeft,
	onRotateRight,
}) => {
	if (config === false) return null

	const { showZoom = true, showFit = true, showRotate = true, tools = [] } =
		config ?? {}

	return (
		<div
			className='medml-viewer-toolbar'
			style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
		>
			{showZoom && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						alignItems: 'center',
					}}
				>
					<ViewerActionButton tone='blue' onClick={onZoomIn} aria-label='Zoom in'>
						+
					</ViewerActionButton>
					<div style={{ fontSize: 15, color: '#666', textAlign: 'center' }}>
						{Math.round(zoom * 100)}%
					</div>
					<ViewerActionButton tone='blue' onClick={onZoomOut} aria-label='Zoom out'>
						-
					</ViewerActionButton>
				</div>
			)}

			{showZoom && showFit && <div style={dividerStyle} />}

			{showFit && (
				<ViewerActionButton
					tone='orange'
					compact
					onClick={onFit}
					aria-label='Fit to screen'
				>
					Fit
				</ViewerActionButton>
			)}

			{showFit && showRotate && <div style={dividerStyle} />}

			{showRotate && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						alignItems: 'center',
					}}
				>
					<ViewerActionButton
						tone='purple'
						onClick={onRotateLeft}
						aria-label='Rotate left'
					>
						↶
					</ViewerActionButton>
					<ViewerActionButton
						tone='purple'
						onClick={onRotateRight}
						aria-label='Rotate right'
					>
						↷
					</ViewerActionButton>
				</div>
			)}

			{tools.length > 0 && (
				<>
					<div style={dividerStyle} />
					<div
						className='medml-viewer-toolbar-tools'
						style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
					>
						{tools.map(tool => (
							<ViewerActionButton
								key={tool.id}
								compact
								disabled={tool.disabled}
								aria-pressed={activeTool === tool.id}
								onClick={() => onToolChange?.(tool.id)}
								tone={activeTool === tool.id ? 'green' : 'gray'}
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 4,
								}}
							>
								{tool.icon}
								{tool.label}
							</ViewerActionButton>
						))}
					</div>
				</>
			)}
		</div>
	)
}

export default ViewerToolbar
