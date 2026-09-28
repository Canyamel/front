import type { PlanePoint } from '../geometry'

/**
 * Растровая маска кисти и её превращение в векторный контур.
 *
 * Снаружи модуль работает только в координатах снимка: и штрихи, и готовый
 * полигон. Внутри маска может быть мельче снимка (см. `MAX_MASK_PIXELS`) —
 * пересчёт спрятан в `imageToMask` / `maskToImage`.
 *
 * Доменного здесь ничего нет: на выходе — полигон в координатах снимка,
 * который каждый контур сохраняет своим способом (узел в УЗИ, сегмент
 * в цитологии).
 */

/**
 * Предел размера растра маски — 4 млн пикселей (4 МБ `Uint8Array`).
 *
 * Маску нельзя делать «один в один» со снимком: цитология открывает
 * whole-slide изображения в десятки тысяч пикселей по стороне, и
 * `new Uint8Array(width * height)` на них падает с
 * `RangeError: Array buffer allocation failed`. Для таких снимков маска
 * берётся пропорционально мельче — кисть становится грубее, зато работает.
 * Снимки УЗИ в этот предел укладываются целиком, для них `scale === 1`.
 *
 * Предел именно такой, а не «сколько влезет»: под растр заводится ещё и
 * внеэкранный канвас того же размера (4 байта на пиксель), а у браузеров
 * есть ограничение на площадь канваса — у Safari около 16 млн пикселей.
 */
const MAX_MASK_PIXELS = 4_000_000

export interface BrushMask {
	width: number
	height: number
	/** 1 — закрашено, 0 — пусто. Длина = width × height. */
	data: Uint8Array
	/** Размеры снимка, к которым привязана маска. */
	imageWidth: number
	imageHeight: number
	/** Пикселей маски на пиксель снимка; ≤ 1. */
	scale: number
}

export type Point2D = PlanePoint

/** Точка снимка → точка растра маски. */
function imageToMask(mask: BrushMask, point: PlanePoint): PlanePoint {
	return { x: point.x * mask.scale, y: point.y * mask.scale }
}

/** Точка растра маски → точка снимка. */
function maskToImage(mask: BrushMask, point: PlanePoint): PlanePoint {
	return { x: point.x / mask.scale, y: point.y / mask.scale }
}

/**
 * Маска под снимок заданного размера.
 */
export function createMask(imageWidth: number, imageHeight: number): BrushMask {
	const safeWidth = Math.max(0, Math.floor(imageWidth))
	const safeHeight = Math.max(0, Math.floor(imageHeight))
	const pixels = safeWidth * safeHeight

	const scale = pixels > MAX_MASK_PIXELS ? Math.sqrt(MAX_MASK_PIXELS / pixels) : 1

	const width = safeWidth === 0 ? 0 : Math.max(1, Math.floor(safeWidth * scale))
	const height = safeHeight === 0 ? 0 : Math.max(1, Math.floor(safeHeight * scale))

	return {
		width,
		height,
		data: new Uint8Array(width * height),
		imageWidth: safeWidth,
		imageHeight: safeHeight,
		scale,
	}
}

export function isMaskEmpty(mask: BrushMask): boolean {
	return !mask.data.some(value => value === 1)
}

/**
 * Круглый штрих кисти. `value` = 1 рисует, 0 стирает — ластик это тот же
 * штрих с нулём, отдельного алгоритма не нужно.
 *
 * Центр и радиус — в пикселях снимка.
 */
export function paintCircle(mask: BrushMask, imageX: number, imageY: number, imageRadius: number, value: 0 | 1): void {
	const { x: cx, y: cy } = imageToMask(mask, { x: imageX, y: imageY })
	// Радиус тоже в координатах снимка: на уменьшенной маске мазок должен
	// остаться того же размера относительно изображения.
	const r = Math.max(0.5, imageRadius * mask.scale)
	const minX = Math.max(0, Math.floor(cx - r))
	const maxX = Math.min(mask.width - 1, Math.ceil(cx + r))
	const minY = Math.max(0, Math.floor(cy - r))
	const maxY = Math.min(mask.height - 1, Math.ceil(cy + r))
	const rSq = r * r

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const dx = x - cx
			const dy = y - cy
			if (dx * dx + dy * dy <= rSq) {
				mask.data[y * mask.width + x] = value
			}
		}
	}
}

/**
 * Штрих между двумя точками (в координатах снимка): мышь двигается рывками,
 * и без интерполяции на быстром движении оставались бы разрывы.
 */
export function paintStroke(mask: BrushMask, from: Point2D, to: Point2D, radius: number, value: 0 | 1): void {
	// Плотность промежуточных кругов считаем в пикселях растра: дыры могут
	// появиться только там, а на уменьшенной маске их нужно меньше.
	const distanceInMask = Math.hypot(to.x - from.x, to.y - from.y) * mask.scale
	const stepInMask = Math.max(1, (radius * mask.scale) / 2)
	const steps = Math.max(1, Math.ceil(distanceInMask / stepInMask))

	for (let i = 0; i <= steps; i++) {
		const t = i / steps
		paintCircle(mask, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius, value)
	}
}

/** Прямоугольник в координатах растра маски. */
export interface MaskRect {
	x: number
	y: number
	width: number
	height: number
}

/**
 * Область растра, которую задел бы штрих, — с запасом на радиус и обрезкой по
 * границам маски. `null`, если штрих целиком вне маски.
 *
 * Нужна, чтобы перерисовывать только изменившийся кусок: маска бывает в
 * миллионы пикселей, и проходить её целиком на каждое движение мыши нельзя.
 */
export function strokeBoundsInMask(mask: BrushMask, from: Point2D, to: Point2D, radius: number): MaskRect | null {
	if (mask.width === 0 || mask.height === 0) return null

	const start = imageToMask(mask, from)
	const end = imageToMask(mask, to)
	// Радиус в пикселях растра, +1 пиксель на округления при закраске.
	const r = Math.max(0.5, radius * mask.scale) + 1

	const minX = Math.max(0, Math.floor(Math.min(start.x, end.x) - r))
	const maxX = Math.min(mask.width - 1, Math.ceil(Math.max(start.x, end.x) + r))
	const minY = Math.max(0, Math.floor(Math.min(start.y, end.y) - r))
	const maxY = Math.min(mask.height - 1, Math.ceil(Math.max(start.y, end.y) + r))

	if (maxX < minX || maxY < minY) return null

	return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function isFilled(mask: BrushMask, x: number, y: number): boolean {
	if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false
	return mask.data[y * mask.width + x] === 1
}

/** Соседи по Муру, по часовой стрелке, начиная сверху. */
const MOORE_OFFSETS: Array<[number, number]> = [
	[0, -1],
	[1, -1],
	[1, 0],
	[1, 1],
	[0, 1],
	[-1, 1],
	[-1, 0],
	[-1, -1],
]

/**
 * Внешний контур закрашенной области — трассировка соседей по Муру
 * с критерием остановки Якоба.
 *
 * Берётся одна (первая найденная) область: врач обводит один узел, а
 * случайные отдельные мазки в контур попадать не должны.
 */
export function traceOuterContour(mask: BrushMask): Point2D[] {
	if (mask.width === 0 || mask.height === 0) return []

	// Стартовая точка: первый закрашенный пиксель при обходе сверху вниз.
	let start: Point2D | null = null
	for (let y = 0; y < mask.height && !start; y++) {
		for (let x = 0; x < mask.width; x++) {
			if (isFilled(mask, x, y)) {
				start = { x, y }
				break
			}
		}
	}
	if (!start) return []

	const contour: Point2D[] = [start]
	// Направление, откуда пришли: слева от стартового пикселя.
	let backtrackIndex = 6
	let current = start
	// Пикселей в контуре не может быть больше, чем в маске; ограничение
	// защищает от зацикливания на вырожденных фигурах.
	const maxSteps = mask.width * mask.height * 8

	for (let step = 0; step < maxSteps; step++) {
		let found = false

		for (let i = 1; i <= MOORE_OFFSETS.length; i++) {
			const index = (backtrackIndex + i) % MOORE_OFFSETS.length
			const [dx, dy] = MOORE_OFFSETS[index]
			const nx = current.x + dx
			const ny = current.y + dy

			if (isFilled(mask, nx, ny)) {
				// Откуда пришли в нового соседа — противоположное направление.
				backtrackIndex = (index + 4) % MOORE_OFFSETS.length
				current = { x: nx, y: ny }
				found = true
				break
			}
		}

		if (!found) break

		// Критерий Якоба: вернулись в старт — контур замкнут.
		if (current.x === start.x && current.y === start.y) break

		contour.push(current)
	}

	return contour
}

/** Периметр расстояния от точки до отрезка — для Douglas-Peucker. */
function perpendicularDistance(point: Point2D, a: Point2D, b: Point2D): number {
	const dx = b.x - a.x
	const dy = b.y - a.y

	if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y)

	const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)
	const clamped = Math.max(0, Math.min(1, t))
	const projX = a.x + clamped * dx
	const projY = a.y + clamped * dy

	return Math.hypot(point.x - projX, point.y - projY)
}

/**
 * Упрощение контура (Douglas-Peucker).
 *
 * Трассировка даёт точку на каждый пиксель границы — для полигона это
 * избыточно: сотни точек тормозят редактор и раздувают запрос на бэкенд.
 */
export function simplifyContour(points: Point2D[], tolerance = 2): Point2D[] {
	if (points.length <= 2) return [...points]

	const first = points[0]
	const last = points[points.length - 1]

	let maxDistance = 0
	let index = 0

	for (let i = 1; i < points.length - 1; i++) {
		const distance = perpendicularDistance(points[i], first, last)
		if (distance > maxDistance) {
			maxDistance = distance
			index = i
		}
	}

	if (maxDistance <= tolerance) return [first, last]

	const left = simplifyContour(points.slice(0, index + 1), tolerance)
	const right = simplifyContour(points.slice(index), tolerance)

	// Стык дублируется — убираем одну копию.
	return [...left.slice(0, -1), ...right]
}

/**
 * Маска → готовый к отправке контур в координатах снимка: трассировка,
 * упрощение и отсев вырожденных результатов (полигон меньше трёх точек не
 * имеет смысла).
 *
 * `tolerance` — в пикселях растра маски: упрощать нужно ровно ту ступенчатую
 * границу, которую дала трассировка.
 */
export function maskToPolygon(mask: BrushMask, tolerance = 2): Point2D[] | null {
	const traced = traceOuterContour(mask)
	if (traced.length < 3) return null

	const simplified = simplifyContour(traced, tolerance)
	if (simplified.length < 3) return null

	return simplified.map(point => maskToImage(mask, point))
}
