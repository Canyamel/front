'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

import ErrorFallback from './ErrorFallback'

export interface ErrorBoundaryProps {
	children: ReactNode
	/** Смена значения снимает ошибку — например, `location.pathname`. */
	resetKey?: unknown
	homeHref?: string
}

interface ErrorBoundaryState {
	error: Error | null
	resetKey: unknown
}

/**
 * Ловит ошибки отрисовки и показывает ErrorFallback вместо белого листа.
 *
 * Ошибки загрузки самого бандла сюда не доходят — React тогда не запускается.
 * Их ловит запасной экран в index.html (`#boot-error`).
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey }

	static getDerivedStateFromError(error: unknown): Pick<ErrorBoundaryState, 'error'> {
		return { error: error instanceof Error ? error : new Error(String(error)) }
	}

	static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): ErrorBoundaryState | null {
		return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error('[ErrorBoundary]', error, info.componentStack)
	}

	render() {
		if (this.state.error) {
			return <ErrorFallback error={this.state.error} homeHref={this.props.homeHref} />
		}
		return this.props.children
	}
}
