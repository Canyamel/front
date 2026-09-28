/**
 * Размеры щитовидной железы из `details` исследования.
 *
 * Бэкенд хранит каждый линейный размер в двух полях:
 *
 * - актуальное `*_lobe_*` / `isthmus_thickness` — миллиметры, его пишет
 *   только нейросеть (`thyroid_structure_service.calculate_metrics`);
 * - legacy `right_length`, `isthmus`, … — сантиметры (`мм / 10`). Его
 *   нейросеть пишет вместе с актуальным, и только его принимает ручка
 *   сохранения (`PUT /uzi/{id}/update/` выбрасывает `*_lobe_*`).
 *
 * Отсюда правила чтения:
 *
 * 1. Оба поля есть и согласованы — берём миллиметры (точнее, legacy
 *    округлён до 0.1 мм).
 * 2. Оба есть, но расходятся — врач правил размер после нейросети, верим
 *    legacy × 10: актуальное поле после правки остаётся старым.
 * 3. Legacy явно `0`, а миллиметры есть — врач очистил поле. Нейросеть
 *    всегда пишет оба поля сразу, так что иначе такая пара не возникает.
 * 4. Есть только legacy — × 10. Значение, невозможное в сантиметрах
 *    (доля длиннее 15 см и т.п.), считаем уже миллиметрами: так лежат
 *    размеры, введённые врачами до этой правки, когда поля были подписаны
 *    «мм». Мелкие значения так отличить нельзя — их чинить на бэкенде.
 * 5. Нули, пустые строки и мусор — не измерение.
 *
 * Запись идёт обратно в legacy (`мм / 10`), см. `toLegacyDetails`.
 */

export const THYROID_DIMENSION_KEYS = [
	'isthmus_thickness',
	'right_lobe_length',
	'right_lobe_width',
	'right_lobe_thickness',
	'left_lobe_length',
	'left_lobe_width',
	'left_lobe_thickness',
] as const

export type ThyroidDimensionKey = (typeof THYROID_DIMENSION_KEYS)[number]

export type ThyroidDimensionsMm = Record<ThyroidDimensionKey, number | undefined>

/** Legacy-поле (сантиметры), в которое пишется каждый размер. */
export const LEGACY_DIMENSION_KEY: Record<ThyroidDimensionKey, string> = {
	isthmus_thickness: 'isthmus',
	right_lobe_length: 'right_length',
	right_lobe_width: 'right_width',
	right_lobe_thickness: 'right_depth',
	left_lobe_length: 'left_length',
	left_lobe_width: 'left_width',
	left_lobe_thickness: 'left_depth',
}

/**
 * Верхняя граница правдоподобного значения в сантиметрах. Больше — это
 * заведомо миллиметры, записанные в legacy-поле.
 */
const MAX_PLAUSIBLE_CM: Record<ThyroidDimensionKey, number> = {
	isthmus_thickness: 5,
	right_lobe_length: 15,
	right_lobe_width: 10,
	right_lobe_thickness: 10,
	left_lobe_length: 15,
	left_lobe_width: 10,
	left_lobe_thickness: 10,
}

/**
 * Legacy округляется до 0.01 см = 0.1 мм, значит у согласованной пары
 * расхождение не больше 0.05 мм.
 */
const CONSISTENCY_TOLERANCE_MM = 0.06

/** Положительное конечное число; строки из `<Input type='number'>` тоже. */
export function positiveNumber(value: unknown): number | undefined {
	if (value == null || value === '' || typeof value === 'boolean') return undefined
	const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'))
	return Number.isFinite(n) && n > 0 ? n : undefined
}

function isExplicitZero(value: unknown): boolean {
	if (value == null || value === '' || typeof value === 'boolean') return false
	return Number(value) === 0
}

function roundMm(mm: number): number {
	return Number(mm.toFixed(2))
}

export function readDimensionMm(details: Record<string, unknown>, key: ThyroidDimensionKey): number | undefined {
	const mm = positiveNumber(details[key])
	const legacyRaw = details[LEGACY_DIMENSION_KEY[key]]
	const cm = positiveNumber(legacyRaw)

	if (cm == null) {
		if (mm != null && isExplicitZero(legacyRaw)) return undefined
		return mm
	}

	const legacyMm = roundMm(cm > MAX_PLAUSIBLE_CM[key] ? cm : cm * 10)
	if (mm == null) return legacyMm

	return Math.abs(mm - legacyMm) <= CONSISTENCY_TOLERANCE_MM ? mm : legacyMm
}

export function readThyroidDimensions(details: Record<string, unknown> | null | undefined): ThyroidDimensionsMm {
	const source = details ?? {}
	return Object.fromEntries(THYROID_DIMENSION_KEYS.map(key => [key, readDimensionMm(source, key)])) as ThyroidDimensionsMm
}

/**
 * Изменённые размеры (мм) → legacy-поля (см) для `PUT /uzi/{id}/update/`.
 *
 * Отдаём только то, что отличается от загруженного: нетронутые размеры
 * не трогаем, чтобы не гонять округление туда-обратно. Очищенное поле
 * отправляем как `0` — `null` и пустую строку бэкенд не примет (400), а
 * ноль при чтении считается «очищено» (правило 3).
 */
export function toLegacyDetails(current: Record<string, unknown>, initial: ThyroidDimensionsMm): Record<string, number> {
	const result: Record<string, number> = {}
	for (const key of THYROID_DIMENSION_KEYS) {
		const next = positiveNumber(current[key])
		const prev = initial[key]
		const unchanged = next == null ? prev == null : prev != null && Math.abs(next - prev) < 1e-9
		if (unchanged) continue
		result[LEGACY_DIMENSION_KEY[key]] = next == null ? 0 : Number((next / 10).toFixed(4))
	}
	return result
}

// --- объёмы ----------------------------------------------------------------

/** V = 0.479 × Д × Ш × Т (мм) / 1000 → см³. */
export const ELLIPSOID_FACTOR = 0.479

export function lobeVolumeCm3(lengthMm?: number, widthMm?: number, thicknessMm?: number): number | undefined {
	if (lengthMm == null || widthMm == null || thicknessMm == null) return undefined
	return Number(((ELLIPSOID_FACTOR * lengthMm * widthMm * thicknessMm) / 1000).toFixed(2))
}

export interface ThyroidVolumesCm3 {
	right?: number
	left?: number
	total?: number
}

/**
 * Объёмы, посчитанные бэкендом (см³). Бэкенд собирает их по последним
 * исследованиям пациента: на одном снимке есть не все три размера доли.
 * После ручной правки размеров бэкенд их не пересчитывает.
 */
export function readBackendVolumes(details: Record<string, unknown> | null | undefined): ThyroidVolumesCm3 {
	const d = details ?? {}
	return {
		right: positiveNumber(d.right_lobe_volume) ?? positiveNumber(d.right_volume),
		left: positiveNumber(d.left_lobe_volume) ?? positiveNumber(d.left_volume),
		total: positiveNumber(d.volume) ?? positiveNumber(d.total_volume),
	}
}

// --- масштаб ---------------------------------------------------------------

/** В файле был физический размер пикселя (DICOM PixelSpacing и т.п.). */
export function hasPhysicalPixelSpacing(details: Record<string, unknown> | null | undefined): boolean {
	return positiveNumber(details?.h_pixel_spacing) != null && positiveNumber(details?.w_pixel_spacing) != null
}

export const MISSING_SCALE_WARNING =
	'В файле отсутствует физический масштаб. Выполните калибровку линейкой для отображения размеров в заключении.'
