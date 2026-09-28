'use client'

import './NotFoundPage.scss'

import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'

export interface NotFoundPageProps {
	title?: string
	description?: string
	homePath?: string
	helpPath?: string | null
}

export default function NotFoundPage({
	title = 'Страница не найдена',
	description = 'Возможно, ссылка устарела или была введена с ошибкой.',
	homePath = '/',
	helpPath = '/faq',
}: NotFoundPageProps) {
	const navigate = useNavigate()

	return (
		<section className='not-found' aria-labelledby='not-found-title'>
			<p className='not-found__code' aria-hidden='true'>
				404
			</p>
			<h1 id='not-found-title' className='not-found__title'>
				{title}
			</h1>
			<p className='not-found__description'>{description}</p>
			<div className='not-found__actions'>
				<Button type='primary' size='large' onClick={() => navigate(homePath)}>
					На главную
				</Button>
				{helpPath ? (
					<Button size='large' onClick={() => navigate(helpPath)}>
						Инструкция
					</Button>
				) : null}
			</div>
		</section>
	)
}
