export { default as ReportModal } from './ui/ReportModal'
export type { ReportModalProps } from './ui/ReportModal'

export { renderReportHtml } from './ui/reportHtml'

export { buildReportModel, buildNodulesDescription, getReportSegments } from './model/buildReportModel'
export type { BuildReportModelOptions } from './model/buildReportModel'

export { useReportExtras } from './model/useReportExtras'
export type { UseReportExtrasResult } from './model/useReportExtras'

export { EMPTY_REPORT_EXTRAS } from './model/types'
export type { ReportExtras, ReportLobe, ReportNodule, ThyroidReportModel } from './model/types'
