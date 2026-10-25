import type { DoctorProfile } from '@/api/doctorApi'
import { formatProjection } from '@/lib/projection'
import type { Segment, ThyroidUziApiResponse } from '@/features/uzi-view/model/types'
import {
	hasPhysicalPixelSpacing,
	lobeVolumeCm3,
	positiveNumber,
	readBackendVolumes,
} from '@/features/uzi-view/model/thyroidDimensions'
import { hasMeasurableAnatomy } from '@/features/uzi-view/model/segmentation'
import { formatNoduleMm, noduleDimensions, type StudyProjection } from '@/features/uzi-view/model/noduleSize'

import type { ReportExtras, ReportLobe, ReportNodule, ThyroidReportModel } from './types'

const DASH = '—'

function text(value: unknown, fallback = DASH): string {
	const s = value == null ? '' : String(value).trim()
	return s || fallback
}

function num(value: unknown, digits = 1, fallback = DASH): string {
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

/**
 * Размеры в мм считает бэкенд, и для этого ему нужен масштаб: из файла
 * либо заданный врачом линейкой (тогда бэкенд пересчитывает размеры при
 * сохранении масштаба). Предупреждаем, когда нет ни того, ни другого.
 */
export function needsScaleCalibration(
	data: ThyroidUziApiResponse,
	pxPerMm: number | null | undefined,
	anatomy?: Segment[],
): boolean {
	if (pxPerMm != null) return false
	if (hasPhysicalPixelSpacing(data.info.details as unknown as Record<string, unknown>)) return false
	// Контуры долей есть, а размеров без масштаба бэкенд не посчитал.
	if (hasMeasurableAnatomy(anatomy)) return true

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

function noduleSize(segment: Segment, study: StudyProjection): string {
	return noduleDimensions(segment.details, study)
		.map(({ label, mm }) => `${label} ${formatNoduleMm(mm)} мм`)
		.join(', ')
}

function buildNodules(segments: Segment[], study: StudyProjection): ReportNodule[] {
	return getReportSegments(segments).map((segment, index) => ({
		number: index + 1,
		tirads: segment.details?.nodule_type ?? undefined,
		size: noduleSize(segment, study),
		location: noduleLocation(segment.details),
		source: segment.is_ai ? 'ai' : 'doctor',
	}))
}

/** Связный текст про узлы — им заполняется раздел «Очаговые изменения». */
export function buildNodulesDescription(nodules: ReportNodule[]): string {
	if (!nodules.length) return 'не выявлены'

	return nodules
		.map(nodule => {
			const source = nodule.source === 'ai' ? 'определён ассистентом по текущему снимку' : 'подтверждён врачом'
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

/** Вывод по разметке узлов — подставляется в графу «Заключение» */
function buildNodulesConclusion(nodules: ReportNodule[], hasNodules: boolean): string {
	const tirads = highestTirads(nodules)
	if (tirads != null) {
		return `Выявлены узловые изменения щитовидной железы, наибольшая категория TI-RADS ${tirads}.`
	}
	return hasNodules ? 'Выявлены узловые изменения щитовидной железы.' : 'Узловые изменения щитовидной железы не выявлены.'
}

const NODULES_CONCLUSION_RE =
	/Выявлены узловые изменения щитовидной железы(?:, наибольшая категория TI-RADS \d+)?\.|Узловые изменения щитовидной железы не выявлены\./

/** Вывод по разметке, уже записанный в текст заключения */
export function findNodulesConclusion(text: string): string | undefined {
	return NODULES_CONCLUSION_RE.exec(text)?.[0]
}

/**
 * Текст заключения с актуальным выводом по разметке: прежний вариант
 * вывода заменяется, а если его нет — вывод дописывается отдельным абзацем
 */
export function withNodulesConclusion(text: string, conclusion: string): string {
	const previous = findNodulesConclusion(text)
	if (previous) return text.replace(previous, conclusion)
	return text.trim() ? `${text.trimEnd()}\n${conclusion}` : conclusion
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
	values: Record<string, unknown>
	doctor?: DoctorProfile
	patientBirthDate?: string
	extras: ReportExtras
	devices?: Array<{ id: number; name: string }>
}

export function buildReportModel({
	data,
	values,
	doctor,
	patientBirthDate,
	extras,
	devices,
}: BuildReportModelOptions): ThyroidReportModel {
	const { patient } = data.info
	const nodules = buildNodules(data.segmentation || [], {
		projectionType: (values.projectionType as string | undefined) || data.info.details?.projection_type,
		anatomySide:
			(values.projectionSide as string | undefined) ||
			data.info.details?.anatomy_side ||
			data.info.details?.projection_side ||
			undefined,
	})
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
		// Аппарат — тот, что выбран в форме, либо тот, что в исследовании.
		deviceName: text(devices?.find(device => device.id === values.uziDevice)?.name ?? data.info.uzi_device_name),
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
		focalChanges: extras.focalChanges == null ? nodulesDescription : text(extras.focalChanges, ''),
		parathyroidDescription: text(extras.parathyroidDescription, ''),
		parathyroidMassesFound: Boolean(extras.parathyroidMassesFound),
		lymphNodes: text(values.rln),
		additionalData: text(values.additional_data, ''),

		nodules,
		nodulesDescription,
		nodulesConclusion: buildNodulesConclusion(nodules, Boolean(values.shortResult) || nodules.length > 0),

		// Печатаем графу «Заключение» как есть: вывод по разметке подставлен
		// в неё заранее, и врач мог его исправить.
		conclusion: text(values.diagnosis, ''),
		recommendations: text(extras.recommendations, ''),
	}
}
