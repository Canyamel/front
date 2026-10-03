import { useCallback, useMemo, useRef, useState } from 'react'

/**
 * Несохранённые правки контуров — одна модель для УЗИ и цитологии.
 *
 * Черновик хранит по ключу контура только итог: создан, изменён или
 * удалён. Повторные правки одного контура схлопываются, а контур, созданный
 * и удалённый до сохранения, из черновика исчезает — на сервер отправлять
 * нечего. Ключ выбирает приложение: обычно id контура на сервере, для нового
 * контура — его локальный id.
 *
 * `P` — точки контура в формате приложения, `D` — доменные данные, нужные
 * при сохранении (узел, тип сегмента).
 */
export type ContourDraft<P, D> =
	| { kind: 'create'; points: P; data?: D }
	| { kind: 'update'; points: P; data?: D }
	| { kind: 'delete'; data?: D }

export type ContourDraftMap<P, D> = ReadonlyMap<string, ContourDraft<P, D>>

export interface ContourDrafts<P, D> {
	drafts: ContourDraftMap<P, D>
	hasChanges: boolean
	getLatest: () => ContourDraftMap<P, D>
	create: (key: string, points: P, data?: D) => void
	update: (key: string, points: P, data?: D) => void
	remove: (key: string, data?: D) => void
	discard: (key: string) => void
	settle: (keys: Iterable<string>) => void
	clear: () => void
}

/** Одна правка поверх черновика. */
export function applyContourDraft<P, D>(
	drafts: ContourDraftMap<P, D>,
	key: string,
	change: ContourDraft<P, D>,
): ContourDraftMap<P, D> {
	const next = new Map(drafts)
	const existing = drafts.get(key)

	if (change.kind === 'delete') {
		if (existing?.kind === 'create') next.delete(key)
		else next.set(key, { kind: 'delete', data: change.data ?? existing?.data })
		return next
	}

	if (change.kind === 'update' && existing?.kind === 'create') {
		next.set(key, { kind: 'create', points: change.points, data: change.data ?? existing.data })
		return next
	}

	next.set(key, { ...change, data: change.data ?? existing?.data })
	return next
}

const EMPTY: ContourDraftMap<never, never> = new Map()

export function useContourDrafts<P, D = undefined>(): ContourDrafts<P, D> {
	const [drafts, setDrafts] = useState<ContourDraftMap<P, D>>(EMPTY)

	const latestRef = useRef<ContourDraftMap<P, D>>(EMPTY)

	const commit = useCallback((next: ContourDraftMap<P, D>) => {
		if (next === latestRef.current) return
		latestRef.current = next
		setDrafts(next)
	}, [])

	const create = useCallback(
		(key: string, points: P, data?: D) =>
			commit(applyContourDraft(latestRef.current, key, { kind: 'create', points, data })),
		[commit],
	)

	const update = useCallback(
		(key: string, points: P, data?: D) =>
			commit(applyContourDraft(latestRef.current, key, { kind: 'update', points, data })),
		[commit],
	)

	const remove = useCallback(
		(key: string, data?: D) => commit(applyContourDraft(latestRef.current, key, { kind: 'delete', data })),
		[commit],
	)

	const discard = useCallback(
		(key: string) => {
			if (!latestRef.current.has(key)) return
			const next = new Map(latestRef.current)
			next.delete(key)
			commit(next)
		},
		[commit],
	)

	const settle = useCallback(
		(keys: Iterable<string>) => {
			const done = new Set(keys)
			if (done.size === 0) return
			commit(new Map([...latestRef.current].filter(([key]) => !done.has(key))))
		},
		[commit],
	)

	const clear = useCallback(() => commit(EMPTY), [commit])
	const getLatest = useCallback(() => latestRef.current, [])

	return useMemo(
		() => ({ drafts, hasChanges: drafts.size > 0, getLatest, create, update, remove, discard, settle, clear }),
		[drafts, getLatest, create, update, remove, discard, settle, clear],
	)
}
