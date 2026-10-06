'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Modal } from 'antd'

import { ModalContext } from '../../contexts'
import type { IModalConfig } from '../../contexts'

import './ModalWrapper.scss'

interface ModalWrapperProps {
	children: ReactNode
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ children }) => {
	const [opened, setOpened] = useState<boolean>(false)
	const [config, setConfig] = useState<IModalConfig | undefined>(undefined)

	const open = useCallback((next: IModalConfig) => {
		setConfig(next)
		setOpened(true)
	}, [])

	const close = useCallback(() => {
		setOpened(false)
	}, [])

	const changeModalProps = useCallback((props: IModalConfig['props']) => {
		setConfig(prev => (prev ? { ...prev, props } : prev))
	}, [])

	const contextValue = useMemo(() => ({ open, close, changeModalProps }), [open, close, changeModalProps])

	const handleAfterClose = useCallback(() => {
		config?.props?.afterClose?.()
		setConfig(undefined)
	}, [config])

	return (
		<ModalContext.Provider value={contextValue}>
			{children}
			<Modal
				transitionName='ant-fade'
				{...config?.props}
				open={opened}
				onCancel={close}
				afterClose={handleAfterClose}
				destroyOnHidden
				className={['modal-container', config?.props?.className].filter(Boolean).join(' ')}
			>
				{config?.content}
			</Modal>
		</ModalContext.Provider>
	)
}

export default ModalWrapper
