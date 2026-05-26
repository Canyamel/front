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

export interface SegmentDetails {
	nodule_type: number
	nodule_2?: number
	nodule_3?: number
	nodule_2_3?: number
	nodule_4: number
	nodule_5: number
	nodule_width: number
	nodule_height: number
	nodule_length: number
}

export interface SegmentPoint {
	x: number
	y: number
	z: number
	uid?: number
}

export interface SegmentContour {
	id?: number
	points: SegmentPoint[]
}

export interface Segment {
	id: number
	details: SegmentDetails
	is_ai: boolean
	data?: SegmentContour[]
}

export interface SegmentDraftChange {
	annotationId: string
	type: 'create' | 'update' | 'delete'
	points?: SegmentPoint[]
	segment_group?: string | number
}

export interface InfoDetails {
	cdk: string
	echogenicity: string
	isthmus: number
	left_depth: number
	left_length: number
	left_width: number
	position: string
	profile: string
	result: string
	right_depth: number
	right_length: number
	right_width: number
	rln: string
	structure: string
	additional_data: string
	projection_type?: string
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

export interface PatientInfoSectionProps {
	patient: PatientInfo
	date: string
}

export interface NoduleTypesSectionProps {
	aiTypes: Segment[]
	doctorTypes: Segment[]
}

export interface StudyDataSectionProps {
	form: import('antd').FormInstance
	devices: UziDeviceInfo[]
	modalVisible: boolean
	setModalVisible: (visible: boolean) => void
	onSave: () => Promise<void>
	saving: boolean
}

export interface ActionButtonsProps {
	onSave: () => Promise<void>
}
