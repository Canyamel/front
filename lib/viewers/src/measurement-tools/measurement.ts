/**
 * Измерения на снимке: длина отрезка и перевод пикселей в миллиметры.
 *
 * Модуль чистый — без React, Annotorious и DOM, чтобы формулы можно было
 * читать и проверять отдельно от вьюера. Доменно-специфичные измерения
 * (например, габариты контура по точкам конкретной модели данных) остаются
 * в приложении — здесь только то, что не зависит от формы точки за пределами
 * `{x, y}`.
 */

export interface MeasuredLine {
	x1: number
	y1: number
	x2: number
	y2: number
}

/** Длина отрезка в пикселях изображения. */
export function lineLengthPx(line: MeasuredLine): number {
	return Math.hypot(line.x2 - line.x1, line.y2 - line.y1)
}

/** Середина отрезка — точка привязки подписи с расстоянием. */
export function lineMidpoint(line: MeasuredLine): { x: number; y: number } {
	return { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 }
}

/**
 * Наклон отрезка в градусах для поворота подписи вдоль линии.
 *
 * Приводится к диапазону (-90°, 90°]: иначе на отрезках, проведённых
 * справа налево, текст оказывался бы вверх ногами.
 */
export function lineAngleDeg(line: MeasuredLine): number {
	const deg = (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI

	if (deg > 90) return deg - 180
	if (deg <= -90) return deg + 180
	return deg
}

/**
 * Положение подписи: середина отрезка, сдвинутая по нормали «вверх»
 * относительно самой линии, чтобы текст не лёг поверх неё.
 */
export function lineLabelAnchor(
	line: MeasuredLine,
	offsetPx = 12,
): { x: number; y: number; angleDeg: number } {
	const mid = lineMidpoint(line)
	const length = lineLengthPx(line)
	const angleDeg = lineAngleDeg(line)

	if (length === 0) return { x: mid.x, y: mid.y - offsetPx, angleDeg }

	// Нормаль к отрезку; знак выбран так, чтобы смещение шло вверх по экрану.
	const nx = -(line.y2 - line.y1) / length
	const ny = (line.x2 - line.x1) / length
	const sign = ny > 0 ? -1 : 1

	return {
		x: mid.x + nx * offsetPx * sign,
		y: mid.y + ny * offsetPx * sign,
		angleDeg,
	}
}

/**
 * Коэффициент масштаба: сколько пикселей приходится на миллиметр.
 * `null`, если данных недостаточно — делить на ноль нельзя.
 */
export function calcPxPerMm(lengthPx: number, lengthMm: number): number | null {
	if (!Number.isFinite(lengthPx) || !Number.isFinite(lengthMm)) return null
	if (lengthPx <= 0 || lengthMm <= 0) return null
	return lengthPx / lengthMm
}

/** Перевод пикселей в миллиметры. `null`, пока масштаб не задан. */
export function pxToMm(px: number, pxPerMm: number | null): number | null {
	if (pxPerMm == null || pxPerMm <= 0) return null
	if (!Number.isFinite(px)) return null
	return px / pxPerMm
}

/** Форматирует миллиметры для подписи: одна цифра после запятой. */
export function formatMm(mm: number | null): string {
	if (mm == null || !Number.isFinite(mm)) return '—'
	return `${mm.toFixed(1)} мм`
}
