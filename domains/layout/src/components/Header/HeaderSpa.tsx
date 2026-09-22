'use client'

import './Header.scss'

import * as React from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button, Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'

import { useAppDispatch, useAppSelector, setToken } from '@medml/store'
import { HeaderIcon } from '@medml/ui'

export interface HeaderNavItem {
	label: string
	to: string
	matchPaths?: string[]
	badge?: number
}

export interface HeaderSpaProps {
	onLogoutClearStorage?: () => void
	navItems?: HeaderNavItem[]
	userInitials?: string
	userName?: string
	userFullName?: string
}

const DEFAULT_NAV_ITEMS: HeaderNavItem[] = [
	{ label: 'Пациенты', to: '/patients', matchPaths: ['/patient_profile'] },
	{ label: 'Добавить снимок', to: '/upload_photo' },
	{ label: 'Помощь', to: '/faq' },
]

export default function HeaderSpa({
	onLogoutClearStorage,
	navItems = DEFAULT_NAV_ITEMS,
	userInitials,
	userName,
	userFullName,
}: HeaderSpaProps) {
	const dispatch = useAppDispatch()
	const navigate = useNavigate()
	const { pathname } = useLocation()
	const accessToken = useAppSelector(s => s.auth.accessToken)

	const [menuOpen, setMenuOpen] = React.useState(false)

	const isAuthenticated = Boolean(accessToken)

	// Панель закрывается при переходе, иначе остаётся открытой поверх страницы.
	React.useEffect(() => {
		setMenuOpen(false)
	}, [pathname])

	const handleLogout = () => {
		dispatch(setToken(undefined))
		onLogoutClearStorage?.()
		navigate('/auth/login', { replace: true })
	}

	const isItemActive = (item: HeaderNavItem) => pathname === item.to || (item.matchPaths?.includes(pathname) ?? false)

	const renderNavItem = (item: HeaderNavItem) => (
		<NavLink
			key={item.to}
			to={item.to}
			className={['app-bar__nav-item', isItemActive(item) ? 'app-bar__nav-item--active' : ''].filter(Boolean).join(' ')}
		>
			{item.label}
			{item.badge != null && item.badge > 0 && <span className='app-bar__badge'>{item.badge}</span>}
		</NavLink>
	)

	return (
		<header className='app-bar'>
			<NavLink to='/' className='app-bar__logo' aria-label='На главную'>
				<HeaderIcon />
			</NavLink>

			{isAuthenticated && <nav className='app-bar__nav'>{navItems.map(renderNavItem)}</nav>}

			<div className='app-bar__actions'>
				{isAuthenticated && (
					<>
						{(userInitials || userName) && (
							<span className='app-bar__user' title={userFullName || userName}>
								{userInitials && (
									<span className='app-bar__avatar' aria-hidden='true'>
										{userInitials}
									</span>
								)}
								{userName && <span className='app-bar__user-name'>{userName}</span>}
							</span>
						)}
						<Button onClick={handleLogout}>Выйти</Button>

						<Button
							className='app-bar__burger'
							icon={<MenuOutlined />}
							aria-label='Меню'
							onClick={() => setMenuOpen(true)}
						/>
					</>
				)}
			</div>

			<Drawer
				className='app-bar-drawer'
				title='Меню'
				placement='right'
				width={280}
				open={menuOpen}
				onClose={() => setMenuOpen(false)}
			>
				<nav className='app-bar-drawer__nav'>{navItems.map(renderNavItem)}</nav>
			</Drawer>
		</header>
	)
}
