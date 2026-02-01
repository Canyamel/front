'use client'
import './Header.css'
import { useCallback } from 'react'
import Link from 'next/link'
import Text from '@/components/Universal/Text/Text'
import { signOut, useSession } from 'next-auth/react'
import noop from 'lodash-es/noop'
import ConditionalRender from '@/components/Universal/ConditionalRender/ConditionalRender'

export default function Header() {
    const { data: session } = useSession()
    const exit = useCallback(() => {
        signOut({ callbackUrl: '/auth-pages/login' }).catch(noop)
    }, [])

    console.log('session frontend', session)

    return (
        <div className="header">
            <div className="content">
                <Text className="siteTitle">MedML</Text>
                <div className="linkBlock">
                    <Text className="link">
                        <Link href="/upload_photo">Добавить снимок</Link>
                    </Text>
                    <Text className="link">
                        <Link href="/patients">Пациенты</Link>
                    </Text>
                    <Text className="link">Почта</Text>
                </div>
                <ConditionalRender condition={session != null}>
                    <Text className="outLink">
                        <span onClick={exit}>Выйти</span>
                    </Text>
                </ConditionalRender>
            </div>
        </div>
    )
}
