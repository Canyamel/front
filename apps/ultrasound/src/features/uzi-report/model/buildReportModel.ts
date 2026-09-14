import type { DoctorProfile } from '@/api/doctorApi'
import { formatProjection } from '@/lib/projection'
import type { Segment, ThyroidUziApiResponse } from '@/features/uzi-view/model/types'

import type { ReportExtras, ReportLobe, ReportNodule, ThyroidReportModel } from './types'

const DASH = '—'

/**
 * Коэффициент эллипсоида для объёма доли ЩЖ: V = 0.479 × Д × Ш × Т.
 * Тот же, что в методических рекомендациях ДЗМ и в старом фронте.
 */
const ELLIPSOID_FACTOR = 0.479

function toNumber(value: unknown): number {
	const n = Number(value)
	return Number.isFinite(n) ? n : 0
}

function text(value: unknown, fallback = DASH): string {
	const s = value == null ? '' : String(value).trim()
	return s || fallback
}

/** Число с фиксированной точностью без хвостовых нулей: 4.40 → «4.4», 0 → «—». */
function num(value: unknown, digits = 2, fallback = DASH): string {
	const n = Number(value)
	if (!Number.isFinite(n) || n === 0) return fallback
	return String(Number(n.toFixed(digits)))
}

function lobeVolume(length: unknown, width: unknown, depth: unknown): number {
	const cubicMm = ELLIPSOID_FACTOR * toNumber(length) * toNumber(width) * toNumber(depth)
	return Number((cubicMm / 1000).toFixed(2))
}

function buildLobe(length: unknown, width: unknown, depth: unknown): ReportLobe {
	return {
		length: num(length),
		width: num(width),
		depth: num(depth),
		volume: num(lobeVolume(length, width, depth)),
	}
}

/**
 * Узлы, которые идут в заключение: если врач подтвердил хоть один сегмент,
 * печатаем только врачебные, иначе — то, что нашёл ассистент.
 */
export function getReportSegments(segments: Segment[] = []): Segment[] {
	const doctorSegments = segments.filter(segment => segment.is_ai === false)
	return doctorSegments.length ? doctorSegments : segments
}

function buildNodules(segments: Segment[]): ReportNodule[] {
	return getReportSegments(segments).map((segment, index) => {
		const details = segment.details || ({} as Segment['details'])
		const size = [
			details.nodule_length != null ? `длина ${details.nodule_length} мм` : '',
			details.nodule_width != null ? `ширина ${details.nodule_width} мм` : '',
			details.nodule_height != null ? `толщина ${details.nodule_height} мм` : '',
		]
			.filter(Boolean)
			.join(', ')

		return {
			number: index + 1,
			tirads: details.nodule_type ?? undefined,
			size,
			source: segment.is_ai ? 'ai' : 'doctor',
		}
	})
}

/** Связный текст про узлы — им заполняется раздел «Очаговые изменения». */
export function buildNodulesDescription(nodules: ReportNodule[]): string {
	if (!nodules.length) return 'не выявлены'

	return nodules
		.map(nodule => {
			const source = nodule.source === 'ai' ? 'определён ассистентом' : 'подтверждён врачом'
			const head = [nodule.tirads != null ? `TI-RADS ${nodule.tirads}` : '', nodule.size].filter(Boolean).join(', ')

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
	/** Дата рождения пациента в формате `ДД.ММ.ГГГГ` из `/patient/{id}/`. */
	patientBirthDate?: string
	extras: ReportExtras
}

export function buildReportModel({
	data,
	values,
	doctor,
	patientBirthDate,
	extras,
}: BuildReportModelOptions): ThyroidReportModel {
	const { patient } = data.info
	const nodules = buildNodules(data.segmentation || [])
	const nodulesDescription = buildNodulesDescription(nodules)

	const right = buildLobe(values.right_length, values.right_width, values.right_depth)
	const left = buildLobe(values.left_length, values.left_width, values.left_depth)

	// Объём железы врач может задать руками; иначе считаем как сумму долей.
	const manualVolume = toNumber(values.volume)
	const total =
		manualVolume > 0
			? manualVolume
			: lobeVolume(values.right_length, values.right_width, values.right_depth) +
				lobeVolume(values.left_length, values.left_width, values.left_depth)

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

		isthmus: num(values.isthmus),
		right,
		left,
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
