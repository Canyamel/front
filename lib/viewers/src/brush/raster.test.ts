import { describe, expect, it } from 'vitest'

import { createMask, fillPolygon, maskToPolygon, paintStroke, type BrushMask } from './raster'

const SQUARE = [
	{ x: 50, y: 50 },
	{ x: 150, y: 50 },
	{ x: 150, y: 150 },
	{ x: 50, y: 150 },
]

function filledCount(mask: BrushMask): number {
	return mask.data.reduce((sum, value) => sum + value, 0)
}

function bounds(points: Array<{ x: number; y: number }>) {
	const xs = points.map(point => point.x)
	const ys = points.map(point => point.y)
	return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

describe('fillPolygon', () => {
	it('переносит контур в маску вместе с границей', () => {
		const mask = createMask(200, 200)
		fillPolygon(mask, SQUARE)
		expect(filledCount(mask)).toBe(101 * 101)
	})

	it('контур из маски и обратно почти не меняется', () => {
		const mask = createMask(300, 300)
		paintStroke(mask, { x: 60, y: 80 }, { x: 200, y: 170 }, 25, 1)
		const polygon = maskToPolygon(mask, 2)
		expect(polygon).not.toBeNull()

		const copy = createMask(300, 300)
		fillPolygon(copy, polygon ?? [])
		expect(Math.abs(filledCount(copy) - filledCount(mask)) / filledCount(mask)).toBeLessThan(0.01)
	})
})

describe('maskToPolygon', () => {
	it('кисть расширяет перенесённый контур', () => {
		const mask = createMask(200, 200)
		fillPolygon(mask, SQUARE)
		paintStroke(mask, { x: 150, y: 100 }, { x: 190, y: 100 }, 10, 1)
		expect(bounds(maskToPolygon(mask) ?? []).maxX).toBeGreaterThan(190)
	})

	it('берёт самую крупную область, а не первую сверху', () => {
		const mask = createMask(200, 200)
		paintStroke(mask, { x: 5, y: 5 }, { x: 15, y: 5 }, 3, 1)
		fillPolygon(mask, SQUARE)
		expect(bounds(maskToPolygon(mask) ?? [])).toMatchObject({ minX: 50, minY: 50 })
	})

	it('после разреза ластиком остаётся бóльшая часть', () => {
		const mask = createMask(200, 200)
		fillPolygon(mask, SQUARE)
		paintStroke(mask, { x: 120, y: 40 }, { x: 120, y: 160 }, 4, 0)
		const { minX, maxX } = bounds(maskToPolygon(mask) ?? [])
		expect(minX).toBe(50)
		expect(maxX).toBeLessThan(120)
	})

	it('пустая маска — контура нет', () => {
		expect(maskToPolygon(createMask(10, 10))).toBeNull()
	})
})
