import { useEffect, useState } from 'react'

/**
 * Задержка обновления значения.
 *
 * Нужна предпросмотру: каждая правка поля меняет `srcdoc` iframe, а это
 * полная перезагрузка документа. Без паузы страница мигала бы на каждом
 * набранном символе.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value)

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs)
		return () => clearTimeout(timer)
	}, [value, delayMs])

	return debounced
}
