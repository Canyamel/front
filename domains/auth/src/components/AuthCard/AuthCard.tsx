'use client'

import { Card, Flex } from 'antd'
import { useAuthError } from '../../contexts/AuthErrorContext'

import './AuthCard.scss'

interface AuthCardProps {
	children: React.ReactNode
}

const AuthCard = ({ children }: AuthCardProps) => {
	const { hasError } = useAuthError()

	return (
		<Card className={`auth-card ${hasError ? 'auth-card-error' : ''}`}>
			<Flex className='auth-card-content'>
				<Flex className='auth-card-form'>{children}</Flex>
			</Flex>
		</Card>
	)
}

export default AuthCard
