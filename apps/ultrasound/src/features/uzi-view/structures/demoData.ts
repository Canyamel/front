import type { ThyroidStructureJson } from './types'

/**
 * Демонстрационные контуры ЩЖ — показываются, когда к снимку не приложен
 * JSON со структурами. Используются только как fallback в `useThyroidAnnotator`.
 */
export const demoThyroidStructures: ThyroidStructureJson = {
	view_type: 'long_left',
	'0': {
		left_lobe: {
			confidence: 0.92,
			coords: [
				[120, 80],
				[430, 90],
				[420, 380],
				[140, 360],
				[120, 80],
			],
		},
		right_lobe: {
			confidence: 0.88,
			coords: [
				[470, 90],
				[780, 100],
				[760, 370],
				[450, 360],
				[470, 90],
			],
		},
		isthmus: {
			confidence: 0.78,
			coords: [
				[410, 140],
				[455, 145],
				[455, 190],
				[410, 185],
				[410, 140],
			],
		},
	},
}
