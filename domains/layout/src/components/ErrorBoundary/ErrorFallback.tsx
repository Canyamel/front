'use client'

import './ErrorFallback.scss'

import { Button } from 'antd'

import { withBasePath } from '@medml/shared'

export interface ErrorFallbackProps {
	error: Error
	/** Куда ведёт «К списку пациентов». По умолчанию — `/patients` с префиксом приложения. */
	homeHref?: string
}

/**
 * Экран вместо упавшей страницы.
 *
 * Не зависит от роутера и сторов: показывается и тогда, когда сломались они.
 * Поэтому «К списку пациентов» — обычная ссылка с полной перезагрузкой.
 */
export default function ErrorFallback({ error, homeHref = withBasePath('/patients') }: ErrorFallbackProps) {
	return (
		<section className='error-fallback' role='alert'>
			<h1 className='error-fallback__title'>Не удалось показать страницу</h1>
			<p className='error-fallback__description'>
				Обновите страницу. Если не поможет — сообщите нам и приложите текст из «Подробностей».
			</p>
			<p className='error-fallback__message'>{error.message}</p>
			<div className='error-fallback__actions'>
				<Button type='primary' size='large' onClick={() => window.location.reload()}>
					Обновить страницу
				</Button>
				<Button size='large' href={homeHref}>
					К списку пациентов
				</Button>
			</div>
			<details className='error-fallback__details'>
				<summary>Подробности</summary>
				<pre>{error.stack ?? `${error.name}: ${error.message}`}</pre>
			</details>
		</section>
	)
}
