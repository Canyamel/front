import { useCallback, useSyncExternalStore } from 'react'

/**
 * Узкий вьюпорт (телефон/небольшой планшет).
 *
 * Реализовано через `matchMedia`, а не через сетку antd: пакет визуализации
 * доменно-нейтрален и не должен тянуть UI-библиотеку ради одного брейкпойнта.
 *
 * Подписка сделана через `useSyncExternalStore` — это штатный способ читать
 * внешний источник, без `setState` внутри эффекта и лишнего ре-рендера на
 * первом кадре.
 */
export function useNarrowViewport(maxWidth = 768): boolean {
	const query = `(max-width: ${maxWidth}px)`

	const subscribe = useCallback(
		(onChange: () => void) => {
			if (typeof window === 'undefined' || !window.matchMedia) {
				return () => undefined
			}
			const mql = window.matchMedia(query)
			mql.addEventListener('change', onChange)
			return () => mql.removeEventListener('change', onChange)
		},
		[query],
	)

	const getSnapshot = useCallback(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return false
		return window.matchMedia(query).matches
	}, [query])

	// На сервере медиазапросов нет — считаем экран широким.
	const getServerSnapshot = useCallback(() => false, [])

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
