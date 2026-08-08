import React from 'react'

export type ViewerActionButtonTone =
	| 'blue'
	| 'orange'
	| 'purple'
	| 'green'
	| 'red'
	| 'gray'

export interface ViewerActionButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	tone?: ViewerActionButtonTone
	/** Компактный вариант (меньший шрифт/паддинги) — для текстовых кнопок вроде "Fit". */
	compact?: boolean
}

const TONE_COLORS: Record<ViewerActionButtonTone, string> = {
	blue: '#2196F3',
	orange: '#FF9800',
	purple: '#9C27B0',
	green: '#4CAF50',
	red: '#f44336',
	gray: '#607D8B',
}

/**
 * Единый стиль кнопок вьюера: используется встроенным тулбаром
 * (zoom/fit/rotate/tools) и доменными кнопками в `customToolbarSlot`
 * (например, переключатель видимости сегментов в apps/ultrasound).
 *
 * Вынесена как переиспользуемый примитив, чтобы приложения не
 * копировали paddings/borderRadius/boxShadow кнопок вручную.
 */
const ViewerActionButton: React.FC<ViewerActionButtonProps> = ({
	tone = 'gray',
	compact = false,
	style,
	disabled,
	children,
	...rest
}) => (
	<button
		type='button'
		className='medml-viewer-action-button'
		disabled={disabled}
		style={{
			padding: compact ? '8px 6px' : '8px 12px',
			cursor: disabled ? 'not-allowed' : 'pointer',
			color: 'white',
			border: 'none',
			borderRadius: 8,
			fontSize: compact ? 15 : 20,
			fontWeight: 'bold',
			minWidth: compact ? 100 : 44,
			boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
			backgroundColor: TONE_COLORS[tone],
			opacity: disabled ? 0.6 : 1,
			...style,
		}}
		{...rest}
	>
		{children}
	</button>
)

export default ViewerActionButton
