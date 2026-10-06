import { describe, expect, it } from 'vitest'

import ErrorBoundary from './ErrorBoundary'

describe('ErrorBoundary', () => {
	it('превращает не-Error в Error', () => {
		expect(ErrorBoundary.getDerivedStateFromError('boom')).toEqual({ error: new Error('boom') })
	})

	it('снимает ошибку, когда меняется resetKey', () => {
		const state = { error: new Error('boom'), resetKey: '/cytology/1' }

		expect(ErrorBoundary.getDerivedStateFromProps({ children: null, resetKey: '/patients' }, state)).toEqual({
			error: null,
			resetKey: '/patients',
		})
	})

	it('держит ошибку, пока resetKey прежний', () => {
		const state = { error: new Error('boom'), resetKey: '/cytology/1' }

		expect(ErrorBoundary.getDerivedStateFromProps({ children: null, resetKey: '/cytology/1' }, state)).toBeNull()
	})
})
