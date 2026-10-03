import { useMemo } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'

import {
	useGetCytologyHistoryQuery as useGetCytologyHistoryQueryBase,
	useGetCytologyInfoQuery as useGetCytologyInfoQueryBase,
	useGetCytologySegmentsQuery as useGetCytologySegmentsQueryBase,
	useGetCytologyTypesQuery as useGetCytologyTypesQueryBase,
} from '@/lib/cytologyApi'

import { mapToICytology } from '../adapters/mapToICytology'
import { mapToSegmentStack } from '../adapters/mapToSegmentStack'
import type { ICytology, ICytologyHistory } from '../types/cytology'
import type { ISegmentStack, ISegmentType } from '../types/segments'

export function useGetCytologyInfoQuery(id: string | typeof skipToken) {
	const result = useGetCytologyInfoQueryBase(id, { skip: id === skipToken })
	const raw = result.data
	const data = useMemo<ICytology | undefined>(() => (raw ? mapToICytology(raw) : undefined), [raw])
	return { ...result, data }
}

export function useGetCytologyTypesQuery(id: string | typeof skipToken) {
	return useGetCytologyTypesQueryBase(id, { skip: id === skipToken }) as ReturnType<
		typeof useGetCytologyTypesQueryBase
	> & { data?: ISegmentType[] }
}

/** Сегменты всех типов исследования. */
export function useGetCytologySegmentsQuery(args: { id: string; types: string[] } | typeof skipToken) {
	const result = useGetCytologySegmentsQueryBase(args, { skip: args === skipToken })
	const raw = result.data
	const data = useMemo<ISegmentStack[] | undefined>(() => (raw ? mapToSegmentStack(raw) : undefined), [raw])
	return { ...result, data }
}

export { useSaveCytologyRevisionMutation } from '@/lib/cytologyApi'

export function useGetCytologyHistoryQuery(id: string | typeof skipToken) {
	return useGetCytologyHistoryQueryBase(id, { skip: id === skipToken }) as ReturnType<
		typeof useGetCytologyHistoryQueryBase
	> & { data?: ICytologyHistory }
}
