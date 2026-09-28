import type { DoctorProfile } from '@/api/doctorApi'
import { formatProjection } from '@/lib/projection'
import type { Segment, ThyroidUziApiResponse } from '@/features/uzi-view/model/types'
import {
	hasPhysicalPixelSpacing,
	lobeVolumeCm3,
	positiveNumber,
	readBackendVolumes,
} from '@/features/uzi-view/model/thyroidDimensions'
import { pxToMm } from '@medml/viewers'

import type { ReportExtras, ReportLobe, ReportNodule, ThyroidReportModel } from './types'

const DASH = '—'

function text(value: unknown, fallback = DASH): string {
	const s = value == null ? '' : String(value).trim()
	return s || fallback
}

function num(value: unknown, digits = 2, fallback = DASH): string {
	const n = positiveNumber(value)
	return n == null ? fallback : String(Number(n.toFixed(digits)))
}

/**
 * Доля в заключении. Размеры — миллиметры из формы (канонические имена,
 * см. `thyroidDimensions.ts`). Объём считаем сами, если есть все три
 * размера: так он учитывает правку врача. Иначе берём объём бэкенда.
 */
function buildLobe(
	values: Record<string, unknown>,
	side: 'right' | 'left',
	backendVolume: number | undefined,
): { lobe: ReportLobe; volume: number | undefined } {
	const length = positiveNumber(values[`${side}_lobe_length`])
	const width = positiveNumber(values[`${side}_lobe_width`])
	const thickness = positiveNumber(values[`${side}_lobe_thickness`])
	const volume = lobeVolumeCm3(length, width, thickness) ?? backendVolume

	return {
		lobe: {
			length: num(length),
			width: num(width),
			depth: num(thickness),
			volume: num(volume),
		},
		volume,
	}
}

/** Размеры узла в пикселях*/
const PX_SIZE_KEYS = ['width_px', 'height_px', 'max_dim_px', 'min_dim_px']

export function needsScaleCalibration(data: ThyroidUziApiResponse, pxPerMm: number | null | undefined): boolean {
	if (pxPerMm != null) return false
	if (hasPhysicalPixelSpacing(data.info.details as unknown as Record<string, unknown>)) return false

	return getReportSegments(data.segmentation || []).some(segment => {
		const details = (segment.details ?? {}) as Record<string, unknown>
		const hasMm = Object.keys(details).some(key => key.endsWith('_mm') && positiveNumber(details[key]) != null)
		const hasPx = PX_SIZE_KEYS.some(key => positiveNumber(details[key]) != null)
		return hasPx && !hasMm
	})
}

/**
 * Узлы, которые идут в заключение: если врач подтвердил хоть один сегмент,
 * печатаем только врачебные, иначе — то, что нашёл ассистент.
 */
export function getReportSegments(segments: Segment[] = []): Segment[] {
	const doctorSegments = segments.filter(segment => segment.is_ai === false)
	return doctorSegments.length ? doctorSegments : segments
}

/**
 * Локализация узла. Бэкенд присылает её в `details.location`; значения
 * приходят в двух видах (`right` и `right_lobe`). «Не установлено»
 * (`unknown`, `not_established`) в заключение не печатаем.
 */
const NODULE_LOCATION_LABELS: Record<string, string> = {
	right: 'правая доля',
	right_lobe: 'правая доля',
	left: 'левая доля',
	left_lobe: 'левая доля',
	isthmus: 'перешеек',
}

function noduleLocation(details: Segment['details'] | undefined): string {
	const raw = String(details?.location ?? '')
		.trim()
		.toLowerCase()
	return NODULE_LOCATION_LABELS[raw] ?? ''
}

/** Проекция и доля исследования — запасной источник, если у узла их нет. */
interface StudyProjection {
	projectionType?: string
	anatomySide?: string
}

const round1 = (mm: number): string => String(Number(mm.toFixed(1)))

/** Положительное число из `details` или `undefined`. */
function positive(details: Record<string, unknown>, key: string): number | undefined {
	const n = Number(details[key])
	return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Размер в миллиметрах: сначала то, что посчитал бэкенд, иначе тот же размер в пикселях, переведённый по калибровке врача во вьюере.
 */
function mmValue(
	details: Record<string, unknown>,
	mmKey: string,
	pxKey: string,
	pxPerMm: number | null | undefined,
): number | undefined {
	const mm = positive(details, mmKey)
	if (mm != null) return mm
	const px = positive(details, pxKey)
	if (px == null || pxPerMm == null) return undefined
	return pxToMm(px, pxPerMm) ?? undefined
}

/**
 * Размеры узла по данным бэкенда.
 */
function noduleSize(segment: Segment, study: StudyProjection, pxPerMm: number | null | undefined): string {
	const details = (segment.details ?? {}) as Record<string, unknown>
	const projection = String(details.projection_type || study.projectionType || '').toLowerCase()

	const parts: string[] = []
	const push = (label: string, value: number | undefined) => {
		if (value != null) parts.push(`${label} ${round1(value)} мм`)
	}

	if (projection === 'cross') {
		push('ширина', mmValue(details, 'cross_width_mm', 'width_px', pxPerMm))
		push('толщина', mmValue(details, 'cross_height_mm', 'height_px', pxPerMm))
	} else if (projection === 'long') {
		// Долю берём у узла, затем у исследования; если нигде нет — ту, для
		// которой бэкенд прислал размеры.
		let side = String(details.anatomy_side || study.anatomySide || '').toLowerCase()
		if (side !== 'left' && side !== 'right') {
			side = ['left', 'right'].find(s => positive(details, `long_${s}_max_dim_mm`) != null) ?? ''
		}
		const maxKey = side ? `long_${side}_max_dim_mm` : ''
		const minKey = side ? `long_${side}_min_dim_mm` : ''
		push('длина', mmValue(details, maxKey, 'max_dim_px', pxPerMm))
		push('толщина', mmValue(details, minKey, 'min_dim_px', pxPerMm))
	}

	return parts.join(', ')
}

function buildNodules(segments: Segment[], study: StudyProjection, pxPerMm: number | null | undefined): ReportNodule[] {
	return getReportSegments(segments).map((segment, index) => ({
		number: index + 1,
		tirads: segment.details?.nodule_type ?? undefined,
		size: noduleSize(segment, study, pxPerMm),
		location: noduleLocation(segment.details),
		source: segment.is_ai ? 'ai' : 'doctor',
	}))
}

/** Связный текст про узлы — им заполняется раздел «Очаговые изменения». */
export function buildNodulesDescription(nodules: ReportNodule[]): string {
	if (!nodules.length) return 'не выявлены'

	return nodules
		.map(nodule => {
			const source = nodule.source === 'ai' ? 'определён ассистентом' : 'подтверждён врачом'
			const head = [nodule.location, nodule.tirads != null ? `TI-RADS ${nodule.tirads}` : '', nodule.size]
				.filter(Boolean)
				.join(', ')

			return head
				? `Узел ${nodule.number}: ${head} (${source}).`
				: `Узел ${nodule.number}: размеры не заполнены (${source}).`
		})
		.join(' ')
}

function highestTirads(nodules: ReportNodule[]): number | undefined {
	const values = nodules.map(n => n.tirads).filter((v): v is number => v != null)
	return values.length ? Math.max(...values) : undefined
}

/** Возраст на дату исследования из даты рождения в формате `ДД.ММ.ГГГГ`. */
function ageFromDisplayDate(birthDisplay: string | undefined, studyIso: string | undefined): string {
	const parsed = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(birthDisplay ?? '').trim())
	if (!parsed) return ''

	const [, dd, mm, yyyy] = parsed
	const birth = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
	const at = studyIso ? new Date(studyIso) : new Date()
	if (Number.isNaN(at.getTime())) return ''

	let age = at.getFullYear() - birth.getFullYear()
	const beforeBirthday =
		at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())
	if (beforeBirthday) age -= 1

	if (age < 0 || age > 130) return ''
	return `${age} ${pluralYears(age)}`
}

function pluralYears(age: number): string {
	const tail = age % 100
	if (tail >= 11 && tail <= 14) return 'лет'
	switch (age % 10) {
		case 1:
			return 'год'
		case 2:
		case 3:
		case 4:
			return 'года'
		default:
			return 'лет'
	}
}

const RU_MONTHS = [
	'января',
	'февраля',
	'марта',
	'апреля',
	'мая',
	'июня',
	'июля',
	'августа',
	'сентября',
	'октября',
	'ноября',
	'декабря',
]

/** «17 сентября 2025, 11:52» — как в печатной форме ЕМИАС. */
function formatRuDateTime(iso: string | undefined): string {
	if (!iso?.trim()) return DASH
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return DASH

	const hh = String(date.getHours()).padStart(2, '0')
	const mi = String(date.getMinutes()).padStart(2, '0')
	return `${date.getDate()} ${RU_MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hh}:${mi}`
}

export interface BuildReportModelOptions {
	/** Ответ `/uzi/{id}/?format=json`. */
	data: ThyroidUziApiResponse
	/**
	 * Текущие значения формы параметров исследования. Берём именно их, а не
	 * `data.info.details`: врач должен видеть в заключении то, что перед ним
	 * на экране, даже если он ещё не нажал «Сохранить результат».
	 */
	values: Record<string, unknown>
	doctor?: DoctorProfile
	patientBirthDate?: string
	extras: ReportExtras
	pxPerMm?: number | null
}

export function buildReportModel({
	data,
	values,
	doctor,
	patientBirthDate,
	extras,
	pxPerMm,
}: BuildReportModelOptions): ThyroidReportModel {
	const { patient } = data.info
	const nodules = buildNodules(
		data.segmentation || [],
		{
			projectionType: (values.projectionType as string | undefined) || data.info.details?.projection_type,
			anatomySide:
				(values.projectionSide as string | undefined) ||
				data.info.details?.anatomy_side ||
				data.info.details?.projection_side ||
				undefined,
		},
		pxPerMm,
	)
	const nodulesDescription = buildNodulesDescription(nodules)

	const backendVolumes = readBackendVolumes(data.info.details as unknown as Record<string, unknown>)
	const right = buildLobe(values, 'right', backendVolumes.right)
	const left = buildLobe(values, 'left', backendVolumes.left)

	// Объём железы: введённый врачом → сумма долей (если известны обе) →
	// то, что посчитал бэкенд. Нули не печатаем.
	const total =
		positiveNumber(values.volume) ??
		(right.volume != null && left.volume != null ? Number((right.volume + left.volume).toFixed(2)) : undefined) ??
		backendVolumes.total

	const patientName = [patient.last_name, patient.first_name, patient.fathers_name]
		.filter(part => part && String(part).trim())
		.join(' ')

	return {
		organization: text(doctor?.organization, ''),
		doctorName: text(doctor?.fullName, ''),
		doctorSpeciality: text(doctor?.speciality, ''),

		patientName: text(patientName),
		patientPolicy: text(patient.personal_policy, ''),
		patientBirthDate: text(patientBirthDate, ''),
		patientAge: ageFromDisplayDate(patientBirthDate, data.info.diagnos_date),

		studyDateTime: formatRuDateTime(data.info.diagnos_date),
		deviceName: text(data.info.uzi_device_name),
		projection: formatProjection(
			values.projectionType as string | undefined,
			values.projectionSide as string | undefined,
		),

		preliminaryDiagnosis: text(extras.preliminaryDiagnosis, ''),
		studyReason: text(extras.studyReason, ''),
		justification: text(extras.justification, ''),

		operations: text(extras.operations, ''),
		thyroidDescription: text(extras.thyroidDescription, ''),
		position: text(values.position),
		positionComment: text(extras.positionComment, ''),
		contours: text(values.profile),
		sizeChanged: Boolean(extras.sizeChanged),
		sizeDescription: text(extras.sizeDescription, ''),
		mobility: text(extras.mobility, ''),

		isthmus: num(values.isthmus_thickness),
		right: right.lobe,
		left: left.lobe,
		totalVolume: num(total),

		echogenicity: text(values.echogenicity),
		vascularPattern: text(values.cdk),
		vascularDescription: text(extras.vascularDescription, ''),
		structure: text(values.structure),
		structureDescription: text(extras.structureDescription, ''),

		// Врач может переписать автоописание узлов своими словами.
		focalChanges: text(extras.focalChanges, '') || nodulesDescription,
		parathyroidDescription: text(extras.parathyroidDescription, ''),
		parathyroidMassesFound: Boolean(extras.parathyroidMassesFound),
		lymphNodes: text(values.rln),
		additionalData: text(values.additional_data, ''),

		nodules,
		nodulesDescription,
		highestTirads: highestTirads(nodules),
		hasNodules: Boolean(values.shortResult) || nodules.length > 0,

		conclusion: text(values.diagnosis, ''),
		recommendations: text(extras.recommendations, ''),
	}
}
