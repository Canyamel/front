'use client'

import type { MouseEvent } from 'react'

import './AuthSwitchLink.scss'

interface AuthSwitchLinkProps {
	/** Текст слева, например «Нет аккаунта?». */
	prompt: string
	/** Текст ссылки, например «Зарегистрироваться». */
	label: string
	/** Адрес; используется, если onNavigate не передан (и для «открыть в новой вкладке»). */
	href: string
	/** Переход силами роутера приложения — без перезагрузки страницы. */
	onNavigate?: () => void
}

/**
 * Нижняя строка карточки авторизации по макету: разделитель и
 * «Нет аккаунта? Зарегистрироваться» / «Уже есть аккаунт? Войти».
 */
const AuthSwitchLink = ({ prompt, label, href, onNavigate }: AuthSwitchLinkProps) => {
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (!onNavigate) return
		// Ctrl/⌘-клик и средняя кнопка — пусть браузер откроет новую вкладку.
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
		event.preventDefault()
		onNavigate()
	}

	return (
		<div className='auth-switch'>
			<span className='auth-switch__prompt'>{prompt}</span>
			<a className='auth-switch__link' href={href} onClick={handleClick}>
				{label}
			</a>
		</div>
	)
}

export default AuthSwitchLink
