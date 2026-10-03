import type { ContourDraft, ContourDrafts } from '@medml/viewers'

export interface UziDeviceInfo {
	id: number
	name: string
}

export interface PatientInfo {
	id: number
	last_name: string
	first_name: string
	fathers_name: string
	personal_policy: string
}

/**
 * Что лежит в группе сегментации:
 * - `nodule` — узел (по умолчанию, если бэкенд поле не прислал);
 * - `thyroid_anatomy` — контур доли/перешейка ЩЖ, который пишет ML-воркер.
 *   Узлом не является: TI-RADS и размеров узла у него нет.
 */
export type SegmentSourceType = 'nodule' | 'thyroid_anatomy'

export type AnatomySide = 'left' | 'right'

export interface SegmentDetails {
	source_type?: SegmentSourceType | string

	// узел: TI-RADS и вероятности классов
	nodule_type?: number | null
	nodule_2?: number
	nodule_3?: number
	nodule_2_3?: number
	nodule_4?: number
	nodule_5?: number

	nodule_width?: number
	nodule_height?: number
	nodule_length?: number

	// --- узел: положение и измерения
	projection_type?: string
	anatomy_side?: AnatomySide | null
	location?: string
	location_iou?: number
	location_overlap?: number
	measurement_frame?: number
	width_px?: number
	height_px?: number
	width_mm?: number
	height_mm?: number
	max_dim_px?: number
	min_dim_px?: number
	max_dim_mm?: number
	min_dim_mm?: number
	cross_width_mm?: number
	cross_height_mm?: number
	long_left_max_dim_mm?: number
	long_left_min_dim_mm?: number
	long_right_max_dim_mm?: number
	long_right_min_dim_mm?: number

	// анатомия ЩЖ (`source_type: 'thyroid_anatomy'`)
	/** `right_lobe` | `left_lobe` | `isthmus` */
	structure_type?: string | null
	view_type?: string | null
	/** Кадр снимка, на котором найдена структура (совпадает с `point.z`). */
	source_frame?: number
	confidence?: number
	bbox_x_min?: number
	bbox_y_min?: number
	bbox_x_max?: number
	bbox_y_max?: number
	bbox_width_px?: number
	bbox_height_px?: number
	bbox_area_px?: number
	bbox_width_mm?: number
	bbox_height_mm?: number
}

export interface SegmentPoint {
	x: number
	y: number
	z: number
	uid?: number
}

export interface SegmentContour {
	id?: number
	details?: SegmentDetails
	points: SegmentPoint[]
}

export interface Segment {
	id: number
	details: SegmentDetails
	is_ai: boolean
	data?: SegmentContour[]
}

/**
 * `details` исследования. Размеры ЩЖ приходят в двух форматах — читать их
 * только через `readThyroidDimensions`, напрямую
 * поля не использовать.
 */
export interface InfoDetails {
	cdk: string
	echogenicity: string
	position: string
	profile: string
	result: string
	rln: string
	structure: string
	additional_data: string
	projection_type?: string
	anatomy_side?: string | null
	projection_side?: string | null

	// Размеры ЩЖ, миллиметры. Пишет только нейросеть; после ручной правки
	// врача не обновляются.
	isthmus_thickness?: number
	right_lobe_length?: number
	right_lobe_width?: number
	right_lobe_thickness?: number
	left_lobe_length?: number
	left_lobe_width?: number
	left_lobe_thickness?: number

	// Legacy-размеры ЩЖ, сантиметры. Их пишут и нейросеть, и
	// сохранение формы; при создании исследования бэкенд ставит сюда 0.
	isthmus?: number
	right_length?: number
	right_width?: number
	right_depth?: number
	left_length?: number
	left_width?: number
	left_depth?: number

	// Объёмы, см³. Бэкенд собирает их по последним исследованиям пациента.
	right_lobe_volume?: number
	left_lobe_volume?: number
	volume?: number
	right_volume?: number
	left_volume?: number
	total_volume?: number

	// Физический размер пикселя из файла, мм/пиксель.
	h_pixel_spacing?: number
	w_pixel_spacing?: number
}

export interface Info {
	uzi_device_name: string
	diagnos_date: string
	patient: PatientInfo
	details: InfoDetails
	diagnosis: string
	has_nodules: string
	echo_descr: string
}

export interface ImageInfo {
	id: number
	image: string
	create_date?: string
	delay_time?: number
	viewed_flag?: boolean
	slide_urls?: string[]
	slide_template?: string[]
}

export interface ThyroidUziApiResponse {
	segmentation: Segment[]
	image: ImageInfo
	info: Info & {
		image_count?: number
	}
}

/**
 * Несохранённые правки контуров узлов.
 */
export interface UziContourDraftData {
	/** Узел (группа сегментации), к которому относится контур. */
	group?: string | number
}

export type UziContourDraft = ContourDraft<SegmentPoint[], UziContourDraftData>
export type UziContourDrafts = ContourDrafts<SegmentPoint[], UziContourDraftData>
